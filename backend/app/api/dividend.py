"""
배당 분석 API
"""
import yfinance as yf
from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta

router = APIRouter()


class DividendData(BaseModel):
    """배당 데이터 모델"""
    date: str
    amount: Optional[float] = None
    yield_: Optional[float] = None  # yield는 Python 예약어이므로 yield_ 사용


class DividendResponse(BaseModel):
    """배당 분석 응답"""
    symbol: str
    company_info: Dict[str, Any]
    dividends: List[DividendData]
    five_year_growth_rate: Optional[float] = None
    currency: Optional[str] = None  # 통화 정보 (KRW, USD 등)


@router.get("/dividend/{symbol}", response_model=DividendResponse)
async def get_dividend_history(symbol: str):
    """
    배당 이력 조회
    
    - **symbol**: 주식 심볼 (예: 'AAPL', 'MSFT', '005930' - 한국 종목은 숫자만 입력)
    """
    try:
        print(f"[Dividend API] 배당 이력 조회 시작: {symbol}")
        
        # 한국 종목 처리
        symbol_clean = symbol.replace('.KS', '').replace('.KQ', '')
        if symbol_clean.isdigit() or symbol.endswith('.KS') or symbol.endswith('.KQ'):
            # 한국 종목
            if not symbol.endswith('.KS') and not symbol.endswith('.KQ'):
                ticker_symbol = f"{symbol_clean}.KS"
            else:
                ticker_symbol = symbol
        else:
            ticker_symbol = symbol_clean
        
        ticker = yf.Ticker(ticker_symbol)
        
        # 회사 정보 조회
        company_info = {}
        try:
            info = ticker.info
            if info and isinstance(info, dict):
                # 로고 URL 생성
                logo_url = None
                website = info.get('website', '')
                if website:
                    try:
                        domain = website.replace('https://', '').replace('http://', '').split('/')[0]
                        logo_url = f'https://logo.clearbit.com/{domain}'
                    except:
                        pass
                
                company_info = {
                    'name': info.get('longName', info.get('shortName', symbol)),
                    'logo_url': logo_url,
                    'sector': info.get('sector', 'N/A'),
                    'industry': info.get('industry', 'N/A')
                }
        except Exception as e:
            print(f"[Dividend API] 회사 정보 조회 오류: {e}")
            company_info = {
                'name': symbol,
                'logo_url': None,
                'sector': 'N/A',
                'industry': 'N/A'
            }
        
        # 배당 데이터 조회
        # ticker.dividends가 실패할 경우 history에서 배당 데이터 추출 시도
        try:
            dividends = ticker.dividends
        except Exception as div_error:
            print(f"[Dividend API] ticker.dividends 실패, history fallback 시도: {div_error}")
            # Fallback: try to get history and extract dividends
            try:
                hist = ticker.history(period="5y")
                if not hist.empty and 'Dividends' in hist.columns:
                    dividends = hist['Dividends'].dropna()
                    print(f"[Dividend API] history에서 배당 데이터 추출 성공: {len(dividends)}개")
                else:
                    dividends = None
            except Exception as hist_error:
                print(f"[Dividend API] history fallback도 실패: {hist_error}")
                dividends = None
        
        if dividends is None or (hasattr(dividends, 'empty') and dividends.empty):
            print(f"[Dividend API] {symbol}에 대한 배당 데이터 없음")
            return DividendResponse(
                symbol=symbol.upper(),
                company_info=company_info,
                dividends=[],
                five_year_growth_rate=None
            )
        
        # 통화 정보 확인
        currency = 'USD'  # 기본값
        is_korean = symbol_clean.isdigit() or symbol.endswith('.KS') or symbol.endswith('.KQ')
        if is_korean:
            currency = 'KRW'
            # 회사 정보에서 통화 확인
            try:
                info = ticker.info
                if isinstance(info, dict):
                    currency_from_info = info.get('currency', '')
                    if currency_from_info:
                        currency = currency_from_info
            except:
                pass
        
        # 배당 데이터를 리스트로 변환 (2021년 이후만)
        result = []
        cutoff_date = datetime(2021, 1, 1).date()
        
        for date, amount in dividends.items():
            # 날짜 변환
            if hasattr(date, 'date'):
                date_obj = date.date()
                date_str = date_obj.isoformat()
            elif hasattr(date, 'to_pydatetime'):
                date_obj = date.to_pydatetime().date()
                date_str = date_obj.isoformat()
            else:
                date_str = str(date)
                try:
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                except:
                    date_obj = datetime.now().date()
            
            # 2021년 이전 데이터는 제외
            if date_obj < cutoff_date:
                continue
            
            # 배당 수익률 계산 (현재 가격 기준)
            yield_value = None
            try:
                info = ticker.info
                if isinstance(info, dict):
                    current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                    if current_price and amount:
                        yield_value = amount / current_price
            except:
                pass
            
            result.append({
                'date': date_str,
                'date_obj': date_obj,
                'amount': float(amount) if amount else None,
                'yield_': yield_value
            })
        
        # 최신순으로 정렬
        result.sort(key=lambda x: x['date_obj'], reverse=True)
        
        # 5년간 배당 상승률 계산
        five_years_ago = datetime.now().date() - timedelta(days=5*365)
        five_year_dividends = [d for d in result if d['date_obj'] >= five_years_ago]
        
        five_year_growth_rate = None
        if len(five_year_dividends) >= 2:
            # 최근 1년 평균
            one_year_ago = datetime.now().date() - timedelta(days=365)
            recent_dividends = [d['amount'] for d in five_year_dividends if d['date_obj'] >= one_year_ago and d['amount']]
            older_dividends = [d['amount'] for d in five_year_dividends if d['date_obj'] < one_year_ago and d['amount']]
            
            if recent_dividends and older_dividends:
                recent_avg = sum(recent_dividends) / len(recent_dividends)
                older_avg = sum(older_dividends) / len(older_dividends)
                if older_avg > 0:
                    five_year_growth_rate = ((recent_avg - older_avg) / older_avg) * 100
        
        # DividendData로 변환
        dividend_list = [DividendData(
            date=d['date'],
            amount=d['amount'],
            yield_=d['yield_']
        ) for d in result]
        
        print(f"[Dividend API] 배당 이력 조회 완료: {len(dividend_list)}개, 통화: {currency}")
        return DividendResponse(
            symbol=symbol_clean.upper(),
            company_info=company_info,
            dividends=dividend_list,
            five_year_growth_rate=five_year_growth_rate,
            currency=currency
        )
        
    except Exception as e:
        import traceback
        error_detail = f"배당 이력 조회 실패: {str(e)}"
        print(f"[Dividend API] ❌ 오류: {error_detail}")
        print(f"[Dividend API] 오류 상세:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_detail)

