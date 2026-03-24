"""외국인·기관 매수 패턴 트래커 — KRX 수급 데이터"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/investor-flow", tags=["investor-flow"])


class DailyFlow(BaseModel):
    date: str
    foreign_net: int       # 외국인 순매수 (원)
    institution_net: int   # 기관 순매수 (원)
    individual_net: int    # 개인 순매수 (원)


class InvestorFlowResponse(BaseModel):
    symbol: str
    company_name: str
    days: List[DailyFlow]
    foreign_consecutive: int     # 양수=연속매수일, 음수=연속매도일
    institution_consecutive: int
    foreign_10d_net: int
    institution_10d_net: int
    foreign_ownership_pct: Optional[float] = None
    source: str = "KRX"
    error: Optional[str] = None


def _count_consecutive(values: List[int]) -> int:
    """최근 연속 순매수(양수) or 순매도(음수) 일수"""
    if not values:
        return 0
    sign = 1 if values[0] > 0 else (-1 if values[0] < 0 else 0)
    if sign == 0:
        return 0
    count = 0
    for v in values:
        if (v > 0) == (sign > 0):
            count += 1
        else:
            break
    return count * sign


async def _fetch_pykrx(ticker: str, n_days: int = 20) -> tuple:
    """pykrx로 투자자별 순매수 데이터 조회 (sync → thread pool)"""
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    def _sync_fetch():
        from pykrx import stock
        today = datetime.now()
        # 주말 포함해서 약 2배 기간 조회 후 실제 데이터만 사용
        end_dt = today.strftime("%Y%m%d")
        start_dt = (today - timedelta(days=n_days * 2 + 10)).strftime("%Y%m%d")

        df = stock.get_market_trading_value_by_date(start_dt, end_dt, ticker)
        # 회사명
        try:
            name = stock.get_market_ticker_name(ticker)
        except Exception:
            name = ticker

        # 외국인 지분율 (최근 1일)
        try:
            frgn_df = stock.get_exhaustion_rates_of_foreign_investment_by_date(
                end_dt, end_dt, ticker
            )
            ownership_pct = float(frgn_df["지분율"].iloc[-1]) if not frgn_df.empty else None
        except Exception:
            ownership_pct = None

        return df, name, ownership_pct

    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as pool:
        df, name, ownership_pct = await loop.run_in_executor(pool, _sync_fetch)

    return df, name, ownership_pct


@router.get("/{symbol}", response_model=InvestorFlowResponse)
async def get_investor_flow(
    symbol: str,
    days: int = Query(10, ge=1, le=30),
):
    """한국 종목 외국인·기관 매수 패턴 조회 (최근 N 거래일)"""
    # 종목 코드 추출
    ticker = symbol.replace(".KS", "").replace(".KQ", "").strip()
    if not ticker.isdigit():
        raise HTTPException(status_code=400, detail="한국 종목(.KS/.KQ)만 지원합니다")

    try:
        df, company_name, ownership_pct = await _fetch_pykrx(ticker, days)

        if df is None or df.empty:
            return InvestorFlowResponse(
                symbol=symbol,
                company_name=company_name or ticker,
                days=[],
                foreign_consecutive=0,
                institution_consecutive=0,
                foreign_10d_net=0,
                institution_10d_net=0,
                ownership_pct=ownership_pct,
                source="KRX",
                error="데이터 없음",
            )

        # 최근 N 거래일 (최신순)
        recent = df.tail(days).iloc[::-1]

        daily_list = []
        for idx_date, row in recent.iterrows():
            date_str = str(idx_date)[:10] if hasattr(idx_date, '__str__') else str(idx_date)
            # pykrx 컬럼명 처리 (버전에 따라 다를 수 있음)
            frgn = int(row.get("외국인합계", row.get("외국인", 0)))
            orgn = int(row.get("기관합계", row.get("기관", 0)))
            indv = int(row.get("개인", 0))
            daily_list.append(DailyFlow(
                date=date_str,
                foreign_net=frgn,
                institution_net=orgn,
                individual_net=indv,
            ))

        foreign_vals = [d.foreign_net for d in daily_list]
        inst_vals = [d.institution_net for d in daily_list]

        return InvestorFlowResponse(
            symbol=symbol,
            company_name=company_name or ticker,
            days=daily_list,
            foreign_consecutive=_count_consecutive(foreign_vals),
            institution_consecutive=_count_consecutive(inst_vals),
            foreign_10d_net=sum(foreign_vals),
            institution_10d_net=sum(inst_vals),
            foreign_ownership_pct=ownership_pct,
            source="KRX",
        )

    except Exception as e:
        print(f"[InvestorFlow] 오류 ({ticker}): {e}")
        return InvestorFlowResponse(
            symbol=symbol,
            company_name=ticker,
            days=[],
            foreign_consecutive=0,
            institution_consecutive=0,
            foreign_10d_net=0,
            institution_10d_net=0,
            source="KRX",
            error=f"데이터 조회 실패: {str(e)[:80]}",
        )
