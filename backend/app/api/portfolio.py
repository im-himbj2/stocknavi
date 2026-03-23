"""
Portfolio API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db, SessionLocal
from app.api.deps import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.portfolio import PortfolioItem
from app.models.subscription import Subscription
from pydantic import BaseModel

FREE_PORTFOLIO_LIMIT = 10

router = APIRouter()


class PortfolioItemCreate(BaseModel):
    """Portfolio item creation schema"""
    symbol: str
    quantity: float
    average_price: float
    notes: Optional[str] = None


class PortfolioItemResponse(BaseModel):
    """Portfolio item response schema"""
    id: int
    symbol: str
    quantity: float
    average_price: float
    notes: Optional[str]
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[PortfolioItemResponse])
async def get_portfolio(
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get user's portfolio"""
    if SessionLocal is None:
        raise HTTPException(
            status_code=503,
            detail="데이터베이스가 초기화되지 않았습니다. PostgreSQL 서버가 실행 중인지 확인하세요."
        )
    if not current_user:
        return []
    items = db.query(PortfolioItem).filter(PortfolioItem.user_id == current_user.id).all()
    return items


@router.post("/", response_model=PortfolioItemResponse, status_code=201)
async def add_portfolio_item(
    item: PortfolioItemCreate,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Add item to portfolio"""
    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="포트폴리오에 종목을 추가하려면 로그인하세요."
        )

    if SessionLocal is None:
        raise HTTPException(
            status_code=503,
            detail="데이터베이스가 초기화되지 않았습니다. PostgreSQL 서버가 실행 중인지 확인하세요."
        )

    # 구독 상태 확인
    subscription = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    is_premium = subscription and subscription.is_active and subscription.tier == "premium"
    
    # 무료 사용자 포트폴리오 제한 체크
    if not is_premium:
        existing_count = db.query(PortfolioItem).filter(PortfolioItem.user_id == current_user.id).count()
        if existing_count >= FREE_PORTFOLIO_LIMIT:
            raise HTTPException(
                status_code=403,
                detail=f"무료 사용자는 최대 {FREE_PORTFOLIO_LIMIT}개까지만 포트폴리오에 추가할 수 있습니다. 프리미엄으로 업그레이드하세요."
            )
    
    new_item = PortfolioItem(
        user_id=current_user.id,
        symbol=item.symbol.upper(),
        quantity=item.quantity,
        average_price=item.average_price,
        notes=item.notes
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return new_item


@router.delete("/{item_id}", status_code=204)
async def delete_portfolio_item(
    item_id: int,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Delete item from portfolio"""
    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="포트폴리오에서 종목을 삭제하려면 로그인하세요."
        )

    if SessionLocal is None:
        raise HTTPException(
            status_code=503,
            detail="데이터베이스가 초기화되지 않았습니다. PostgreSQL 서버가 실행 중인지 확인하세요."
        )
    item = db.query(PortfolioItem).filter(
        PortfolioItem.id == item_id
    ).filter(
        PortfolioItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    db.delete(item)
    db.commit()
    
    return None
    

@router.get("/prices")
async def get_portfolio_prices(
    symbols: str = Query(..., description="쉼표로 구분된 종목 심볼"),
    current_user: User = Depends(get_current_user_optional)
):
    """포트폴리오 종목들의 현재가 대량 조회 (한국 주식 KRW/USD 환율 포함)"""
    import yfinance as yf
    from app.services.data.yahoo_finance import YahooFinanceDataProvider

    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    if not symbol_list:
        return {"prices": {}, "usd_krw_rate": None}

    provider = YahooFinanceDataProvider()
    quotes = provider.get_current_prices_batch(symbol_list)

    # .KS 조회 실패한 한국 종목 → .KQ 재시도
    ks_failed = [s for s in symbol_list if s.endswith(".KS") and s not in quotes]
    if ks_failed:
        kq_symbols = [s.replace(".KS", ".KQ") for s in ks_failed]
        kq_quotes = provider.get_current_prices_batch(kq_symbols)
        for ks_sym, kq_sym in zip(ks_failed, kq_symbols):
            if kq_sym in kq_quotes:
                quotes[ks_sym] = kq_quotes[kq_sym]
                print(f"[Portfolio] .KS 실패 → .KQ 성공: {ks_sym} → {kq_sym}")

    # 한국 주식 여부 판별 (.KS 또는 .KQ suffix)
    has_kr = any(s.endswith(".KS") or s.endswith(".KQ") for s in symbol_list)

    # USD/KRW 환율 조회 (한국 주식 있을 때만)
    usd_krw_rate = None
    if has_kr:
        try:
            krw_ticker = yf.Ticker("KRW=X")
            krw_hist = krw_ticker.history(period="2d")
            if not krw_hist.empty:
                usd_krw_rate = float(krw_hist["Close"].iloc[-1])
        except Exception as e:
            print(f"[Portfolio] 환율 조회 실패: {e}")
            usd_krw_rate = 1400.0  # fallback

    # 응답 형식 정리 (currency 필드 추가)
    prices = {}
    for symbol in symbol_list:
        quote = quotes.get(symbol)
        is_kr = symbol.endswith(".KS") or symbol.endswith(".KQ")
        if quote:
            prices[symbol] = {
                "price": quote.get("price", 0),
                "change": quote.get("change", 0),
                "changePercent": quote.get("changePercent", 0),
                "currency": "KRW" if is_kr else "USD"
            }
        else:
            prices[symbol] = {
                "price": 0,
                "change": 0,
                "changePercent": 0,
                "currency": "KRW" if is_kr else "USD"
            }

    return {"prices": prices, "usd_krw_rate": usd_krw_rate}

