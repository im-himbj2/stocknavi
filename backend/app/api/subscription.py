"""
구독제 API - 토스페이먼츠 연동
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import httpx
import base64
import json
from app.core.database import get_db, SessionLocal
from app.core.config import settings
from app.api.auth import get_current_user
from app.models.user import User
from app.models.subscription import Subscription

router = APIRouter()

# 토스페이먼츠 API URL
TOSS_PAYMENTS_API_URL = "https://api.tosspayments.com/v1"


class SubscriptionPlan(BaseModel):
    """구독 플랜"""
    id: str
    name: str
    price: float
    currency: str
    interval: str  # 'month' or 'year'
    features: List[str]


class SubscriptionStatus(BaseModel):
    """구독 상태"""
    tier: str
    is_active: bool
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    toss_payment_id: Optional[str] = None


class PaymentResponse(BaseModel):
    """결제 응답"""
    payment_key: str
    order_id: str
    amount: float
    client_key: str


# 구독 플랜 정의 (원화 기준)
SUBSCRIPTION_PLANS = {
    "monthly": SubscriptionPlan(
        id="monthly",
        name="월간 구독",
        price=19900,  # 원화
        currency="KRW",
        interval="month",
        features=[
            "무제한 기업 분석",
            "무제한 포트폴리오 종목",
            "고급 차트 기능",
            "실시간 뉴스 알림",
            "AI 기반 투자 의견"
        ]
    ),
    "annual": SubscriptionPlan(
        id="annual",
        name="연간 구독",
        price=199000,  # 원화
        currency="KRW",
        interval="year",
        features=[
            "무제한 기업 분석",
            "무제한 포트폴리오 종목",
            "고급 차트 기능",
            "실시간 뉴스 알림",
            "AI 기반 투자 의견",
            "연간 58% 할인"
        ]
    )
}


@router.get("/subscription/plans", response_model=List[SubscriptionPlan])
async def get_subscription_plans():
    """
    구독 플랜 목록 조회
    """
    return list(SUBSCRIPTION_PLANS.values())


def get_toss_auth_header() -> str:
    """토스페이먼츠 인증 헤더 생성"""
    if not settings.TOSS_PAYMENTS_SECRET_KEY:
        raise HTTPException(status_code=503, detail="토스페이먼츠 시크릿 키가 설정되지 않았습니다.")
    
    secret_key = settings.TOSS_PAYMENTS_SECRET_KEY
    encoded = base64.b64encode(f"{secret_key}:".encode()).decode()
    return f"Basic {encoded}"


@router.post("/subscription/create-payment", response_model=PaymentResponse)
async def create_payment(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    토스페이먼츠 결제 생성
    
    - **plan_id**: 플랜 ID ('monthly' or 'annual')
    """
    if not settings.TOSS_PAYMENTS_SECRET_KEY or not settings.TOSS_PAYMENTS_CLIENT_KEY:
        raise HTTPException(status_code=503, detail="토스페이먼츠가 설정되지 않았습니다.")
    
    if plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="잘못된 플랜 ID입니다.")
    
    if SessionLocal is None:
        raise HTTPException(
            status_code=503,
            detail="데이터베이스가 초기화되지 않았습니다."
        )
    
    plan = SUBSCRIPTION_PLANS[plan_id]
    order_id = f"subscription_{current_user.id}_{plan_id}_{int(datetime.now().timestamp())}"
    
    try:
        # 토스페이먼츠 결제 승인 요청 생성
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{TOSS_PAYMENTS_API_URL}/payments/confirm",
                headers={
                    "Authorization": get_toss_auth_header(),
                    "Content-Type": "application/json"
                },
                json={
                    "paymentKey": "",  # 프론트엔드에서 받아옴
                    "orderId": order_id,
                    "amount": int(plan.price)
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"결제 생성 실패: {response.text}")
        
        return PaymentResponse(
            payment_key="",  # 프론트엔드에서 생성
            order_id=order_id,
            amount=plan.price,
            client_key=settings.TOSS_PAYMENTS_CLIENT_KEY
        )
        
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"결제 생성 중 오류: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"결제 생성 실패: {str(e)}")


@router.post("/subscription/confirm-payment")
async def confirm_payment(
    payment_key: str,
    order_id: str,
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    토스페이먼츠 결제 승인
    
    - **payment_key**: 프론트엔드에서 받은 결제 키
    - **order_id**: 주문 ID
    - **plan_id**: 플랜 ID
    """
    if not settings.TOSS_PAYMENTS_SECRET_KEY:
        raise HTTPException(status_code=503, detail="토스페이먼츠가 설정되지 않았습니다.")
    
    if plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="잘못된 플랜 ID입니다.")
    
    plan = SUBSCRIPTION_PLANS[plan_id]
    
    try:
        # 토스페이먼츠 결제 승인
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{TOSS_PAYMENTS_API_URL}/payments/confirm",
                headers={
                    "Authorization": get_toss_auth_header(),
                    "Content-Type": "application/json"
                },
                json={
                    "paymentKey": payment_key,
                    "orderId": order_id,
                    "amount": int(plan.price)
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"결제 승인 실패: {response.text}")
            
            payment_data = response.json()
            
            # 구독 정보 저장
            if SessionLocal:
                db = SessionLocal()
                try:
                    # 구독 기간 계산
                    current_period_start = datetime.now()
                    if plan.interval == "month":
                        current_period_end = current_period_start + timedelta(days=30)
                    else:
                        current_period_end = current_period_start + timedelta(days=365)
                    
                    # 구독 생성 또는 업데이트
                    subscription = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
                    
                    if subscription:
                        subscription.tier = "premium"
                        subscription.is_active = True
                        subscription.toss_payment_id = payment_data.get("paymentKey")
                        subscription.current_period_start = current_period_start
                        subscription.current_period_end = current_period_end
                    else:
                        subscription = Subscription(
                            user_id=current_user.id,
                            tier="premium",
                            is_active=True,
                            toss_payment_id=payment_data.get("paymentKey"),
                            current_period_start=current_period_start,
                            current_period_end=current_period_end
                        )
                        db.add(subscription)
                    
                    # User 모델의 subscription_tier도 업데이트
                    current_user.subscription_tier = "premium"
                    
                    db.commit()
                finally:
                    db.close()
            
            return {"status": "success", "payment": payment_data}
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"결제 승인 중 오류: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"결제 승인 실패: {str(e)}")


@router.post("/subscription/webhook")
async def toss_webhook(
    request: Request
):
    """
    토스페이먼츠 Webhook 처리
    """
    if not settings.TOSS_PAYMENTS_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="토스페이먼츠 Webhook Secret이 설정되지 않았습니다.")
    
    payload = await request.json()
    
    # Webhook 시크릿 검증 (실제 구현 필요)
    # 여기서는 간단히 처리
    
    event_type = payload.get("eventType")
    
    if event_type == "PAYMENT_CONFIRMED":
        await handle_payment_confirmed(payload.get("data"))
    elif event_type == "PAYMENT_CANCELED":
        await handle_payment_canceled(payload.get("data"))
    
    return {"status": "success"}


async def handle_payment_confirmed(payment_data):
    """결제 승인 처리"""
    if SessionLocal is None:
        return
    
    try:
        order_id = payment_data.get('orderId')
        if not order_id:
            return
        
        # order_id에서 user_id 추출 (형식: subscription_{user_id}_{plan_id}_{timestamp})
        parts = order_id.split('_')
        if len(parts) < 2:
            return
        
        user_id = int(parts[1])
        
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return
            
            # 구독 정보 업데이트
            subscription = db.query(Subscription).filter(Subscription.user_id == user_id).first()
            if subscription:
                subscription.tier = "premium"
                subscription.is_active = True
                subscription.toss_payment_id = payment_data.get('paymentKey')
            else:
                subscription = Subscription(
                    user_id=user_id,
                    tier="premium",
                    is_active=True,
                    toss_payment_id=payment_data.get('paymentKey')
                )
                db.add(subscription)
            
            user.subscription_tier = "premium"
            db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"[Subscription Webhook] 결제 승인 처리 오류: {e}")


async def handle_payment_canceled(payment_data):
    """결제 취소 처리"""
    if SessionLocal is None:
        return
    
    try:
        order_id = payment_data.get('orderId')
        if not order_id:
            return
        
        parts = order_id.split('_')
        if len(parts) < 2:
            return
        
        user_id = int(parts[1])
        
        db = SessionLocal()
        try:
            subscription = db.query(Subscription).filter(Subscription.user_id == user_id).first()
            if subscription:
                subscription.is_active = False
                db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"[Subscription Webhook] 결제 취소 처리 오류: {e}")




@router.get("/subscription/status", response_model=SubscriptionStatus)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    현재 구독 상태 조회
    """
    if SessionLocal is None:
        raise HTTPException(
            status_code=503,
            detail="데이터베이스가 초기화되지 않았습니다."
        )
    
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        return SubscriptionStatus(
            tier="free",
            is_active=False
        )
    
    return SubscriptionStatus(
        tier=subscription.tier,
        is_active=subscription.is_active,
        current_period_start=subscription.current_period_start.isoformat() if subscription.current_period_start else None,
        current_period_end=subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        stripe_subscription_id=subscription.stripe_subscription_id
    )


@router.post("/subscription/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    구독 취소
    """
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe가 설정되지 않았습니다.")
    
    if SessionLocal is None:
        raise HTTPException(
            status_code=503,
            detail="데이터베이스가 초기화되지 않았습니다."
        )
    
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription or not subscription.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="활성 구독을 찾을 수 없습니다.")
    
    try:
        # Stripe에서 구독 취소
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )
        
        return {"message": "구독이 취소되었습니다. 현재 기간 종료 시 비활성화됩니다."}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe 오류: {str(e)}")







