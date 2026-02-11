"""
구독제 API - Polar.sh 연동
"""
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
import httpx
from app.core.database import get_db, SessionLocal
from app.core.config import settings
from app.api.auth import get_current_user
from app.models.user import User
from app.models.subscription import Subscription

router = APIRouter()

# Polar.sh API URL
POLAR_API_URL = "https://api.polar.sh/api/v1"

@router.get("/subscription/plans")
async def get_plans():
    """구독 플랜 정보 조회"""
    return [
        {
            "id": "premium_monthly",
            "name": "프리미엄 월간",
            "price": 19.90,
            "interval": "month",
            "features": [
                "무제한 기업 분석",
                "AI 기반 FOMC/연설 요약",
                "고급 포트폴리오 인사이트",
                "실시간 시장 심리 지수",
                "섹터 로테이션 분석"
            ]
        },
        {
            "id": "premium_yearly",
            "name": "프리미엄 연간",
            "price": 199.00,
            "interval": "year",
            "features": [
                "월간 대비 16% 할인",
                "모든 프리미엄 기능 포함",
                "우선 고객 지원",
                "베타 기능 우선 체험"
            ]
        }
    ]

class SubscriptionStatus(BaseModel):
    """구독 상태"""
    tier: str
    is_active: bool
    current_period_end: Optional[str] = None
    polar_subscription_id: Optional[str] = None

@router.get("/subscription/status", response_model=SubscriptionStatus)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """현재 구독 상태 조회"""
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        return SubscriptionStatus(tier="free", is_active=False)
    
    return SubscriptionStatus(
        tier=subscription.tier,
        is_active=subscription.is_active,
        current_period_end=subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        polar_subscription_id=subscription.toss_payment_id # Reusing field for simplicity
    )

@router.post("/subscription/checkout")
async def create_checkout_session(
    current_user: User = Depends(get_current_user)
):
    """Polar.sh 체크아웃 세션 URL 생성"""
    if not settings.POLAR_API_KEY or not settings.POLAR_PRODUCT_ID:
        raise HTTPException(status_code=503, detail="Polar settings missing")

    try:
        async with httpx.AsyncClient() as client:
            # Polar Custom Checkout API
            response = await client.post(
                f"{POLAR_API_URL}/checkouts/custom",
                headers={
                    "Authorization": f"Bearer {settings.POLAR_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "product_id": settings.POLAR_PRODUCT_ID,
                    "customer_email": current_user.email,
                    "success_url": f"{settings.FRONTEND_URL}/subscription/success",
                    "cancel_url": f"{settings.FRONTEND_URL}/subscription",
                    "metadata": {
                        "user_id": str(current_user.id)
                    }
                }
            )
            
            if response.status_code != 201:
                print(f"[Polar] Error: {response.text}")
                raise HTTPException(status_code=400, detail="Failed to create checkout")
                
            data = response.json()
            return {"url": data["url"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscription/webhook")
async def polar_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """Polar.sh 웹훅 처리"""
    # TODO: Signature verification
    try:
        data = await request.json()
        event_type = data.get("type")
        
        if event_type in ["subscription.created", "subscription.updated"]:
            background_tasks.add_task(handle_polar_subscription, data["data"])
        
        return {"status": "accepted"}
    except Exception as e:
        print(f"[Webhook Error] {e}")
        return {"status": "error"}

async def handle_polar_subscription(sub_data: Dict[str, Any]):
    """구독 데이터 처리 및 DB 업데이트"""
    user_id_str = sub_data.get("metadata", {}).get("user_id")
    if not user_id_str:
        return

    db = SessionLocal()
    try:
        # User lookup and update
        subscription = db.query(Subscription).filter(Subscription.user_id == user_id_str).first()
        is_active = sub_data.get("status") == "active"
        
        if subscription:
            subscription.tier = "premium" if is_active else "free"
            subscription.is_active = is_active
            subscription.toss_payment_id = sub_data.get("id")
        else:
            subscription = Subscription(
                user_id=user_id_str,
                tier="premium" if is_active else "free",
                is_active=is_active,
                toss_payment_id=sub_data.get("id")
            )
            db.add(subscription)
            
        user = db.query(User).filter(User.id == user_id_str).first()
        if user:
            user.subscription_tier = "premium" if is_active else "free"
            
        db.commit()
    except Exception as e:
        print(f"[Sync Error] {e}")
        db.rollback()
    finally:
        db.close()
