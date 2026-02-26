import asyncio
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import httpx

from app.services.data.fmp_economic import FMPEconomicProvider
from app.services.data.yahoo_economic import YahooEconomicProvider
from app.services.data.fred_api import FREDDataProvider

router = APIRouter()

# 전역 인스턴스
fmp_provider = FMPEconomicProvider()
yahoo_economic = YahooEconomicProvider()
fred_provider = FREDDataProvider()

# 간단한 메모리 캐시
_cache = {}
_cache_ttl = {}
CACHE_DURATION = 900  # 15분

def get_cached(key: str):
    if key in _cache and key in _cache_ttl:
        if datetime.now() < _cache_ttl[key]:
            return _cache[key]
        else:
            del _cache[key]
            del _cache_ttl[key]
    return None

def set_cached(key: str, value: Any):
    _cache[key] = value
    _cache_ttl[key] = datetime.now() + timedelta(seconds=CACHE_DURATION)

class EconomicIndicatorResponse(BaseModel):
    indicator: str
    data: List[Dict[str, Any]]
    source: str
    cached: bool = False
    updated_at: str

@router.get("/economic/calendar", response_model=EconomicIndicatorResponse)
async def get_economic_calendar(
    start_date: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)")
):
    """경제 캘린더 조회 - FMP API 활용"""
    try:
        now = datetime.now()
        if not end_date:
            end_date = (now + timedelta(days=90)).strftime('%Y-%m-%d')
        if not start_date:
            start_date = (now - timedelta(days=30)).strftime('%Y-%m-%d')

        cache_key = f"economic_calendar_{start_date}_{end_date}"
        cached = get_cached(cache_key)
        if cached:
            return EconomicIndicatorResponse(**{**cached, "cached": True})

        data = await fmp_provider.get_economic_calendar(start_date, end_date)
        
        result = EconomicIndicatorResponse(
            indicator="economic_calendar",
            data=data if data else [],
            source="FMP",
            updated_at=datetime.now().isoformat()
        )
        set_cached(cache_key, result.model_dump())
        return result
    except Exception as e:
        print(f"[Economic Calendar] Error: {e}")
        return EconomicIndicatorResponse(
            indicator="economic_calendar",
            data=[],
            source="Error",
            updated_at=datetime.now().isoformat()
        )

@router.get("/economic/treasury", response_model=EconomicIndicatorResponse)
async def get_treasury_rates():
    """국채 수익률 조회"""
    try:
        cache_key = "treasury_rates"
        cached = get_cached(cache_key)
        if cached:
            return EconomicIndicatorResponse(**{**cached, "cached": True})
            
        data = await fmp_provider.get_treasury_rates()
        result = EconomicIndicatorResponse(
            indicator="treasury_rates",
            data=data if data else [],
            source="FMP",
            updated_at=datetime.now().isoformat()
        )
        set_cached(cache_key, result.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/indices", response_model=EconomicIndicatorResponse)
async def get_market_indices():
    """주요 시장 지수 조회"""
    try:
        cache_key = "market_indices"
        cached = get_cached(cache_key)
        if cached:
            return EconomicIndicatorResponse(**{**cached, "cached": True})
            
        data = await fmp_provider.get_market_indices()
        if not data:
            # Fallback to Yahoo
            symbols = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^KS11', '^KQ11']
            tasks = [yahoo_economic.get_economic_data(s) for s in symbols]
            yahoo_results = await asyncio.gather(*tasks)
            data = []
            for s, r in zip(symbols, yahoo_results):
                if r and 'current_value' in r:
                    data.append({
                        'symbol': s.replace('^', ''),
                        'price': r['current_value'],
                        'change': 0,
                        'changePercent': 0
                    })
        
        result = EconomicIndicatorResponse(
            indicator="market_indices",
            data=data,
            source="FMP/Yahoo",
            updated_at=datetime.now().isoformat()
        )
        set_cached(cache_key, result.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/treasury-yahoo/{maturity}")
async def get_treasury_yahoo(maturity: str = "10y"):
    """Yahoo Finance를 통한 국채 수익률 조회"""
    try:
        cache_key = f"treasury_yahoo_{maturity}"
        cached = get_cached(cache_key)
        if cached: return cached
        
        symbol_map = {"10y": "^TNX", "5y": "^FVX", "30y": "^TYX"}
        symbol = symbol_map.get(maturity, "^TNX")
        data = await yahoo_economic.get_economic_data(symbol)
        
        result = {
            "indicator": f"treasury_{maturity}",
            "data": data if data else [],
            "source": "Yahoo Finance",
            "updated_at": datetime.now().isoformat()
        }
        set_cached(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/api-usage")
async def get_api_usage_info():
    return {
        "total_cached_items": len(_cache),
        "cache_duration_seconds": CACHE_DURATION,
        "note": "캐시를 통해 API 호출을 최소화합니다."
    }

@router.get("/economic/highlights", response_model=EconomicIndicatorResponse)
async def get_economic_highlights():
    try:
        cache_key = "economic_macro_highlights"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})
        
        indicators = ["GDP", "CPI", "unemploymentRate", "interestRate"]
        tasks = [fmp_provider.get_economic_indicator("economic", name=name) for name in indicators]
        results = await asyncio.gather(*tasks)
        
        combined_data = []
        for name, data in zip(indicators, results):
            if data and isinstance(data, list) and len(data) > 0:
                latest = data[0]
                combined_data.append({"name": name, "value": latest.get("value"), "date": latest.get("date")})
        
        result = {
            "indicator": "macro_highlights",
            "data": combined_data,
            "source": "FMP",
            "updated_at": datetime.now().isoformat()
        }
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-sentiment", response_model=EconomicIndicatorResponse)
async def get_market_sentiment():
    """시장 심리 지수 (공포탐욕지수) 조회"""
    try:
        cache_key = "market_sentiment"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})
        
        # CNN-like logic fallback
        final_value = 50 
        try:
            cnn_url = "https://production.dataviz.cnn.io/index/fearandgreed/static/history"
            headers = {"User-Agent": "Mozilla/5.0"}
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(cnn_url, headers=headers)
                if resp.status_code == 200:
                    final_value = int(resp.json().get('fear_and_greed', {}).get('score', 50))
        except: pass

        result = {
            "indicator": "market_sentiment",
            "data": [{"value": final_value, "classification": "Neutral", "timestamp": str(int(datetime.now().timestamp()))}],
            "source": "CNN/Manual",
            "updated_at": datetime.now().isoformat()
        }
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        return EconomicIndicatorResponse(
            indicator="market_sentiment",
            data=[{"value": 50, "classification": "Neutral", "timestamp": str(int(datetime.now().timestamp()))}],
            source="fallback",
            updated_at=datetime.now().isoformat()
        )

@router.get("/sector-rotation", response_model=EconomicIndicatorResponse)
async def get_sector_rotation():
    try:
        cache_key = "sector_rotation"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})
        
        import yfinance as yf
        sector_etfs = {"XLK": "Tech", "XLV": "Health", "XLE": "Energy", "XLF": "Finance", "XLI": "Industrials", "XLY": "ConsDis", "XLP": "ConsStap", "XLU": "Utilities", "XLB": "Materials", "XLRE": "RealEstate", "XLC": "Comm"}
        symbols = list(sector_etfs.keys())
        df = await asyncio.to_thread(yf.download, symbols, period="1mo", interval="1d", progress=False)
        
        sector_data = []
        if not df.empty and 'Close' in df:
            for symbol in symbols:
                try:
                    closes = df['Close'][symbol].dropna()
                    if len(closes) >= 2:
                        change = ((closes.iloc[-1] - closes.iloc[0]) / closes.iloc[0]) * 100
                        sector_data.append({"symbol": symbol, "name": sector_etfs[symbol], "change_percent": float(change)})
                except: pass
        
        sector_data.sort(key=lambda x: x["change_percent"], reverse=True)
        result = {"indicator": "sector_rotation", "data": sector_data, "source": "yfinance", "updated_at": datetime.now().isoformat()}
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/jobless-claims", response_model=EconomicIndicatorResponse)
async def get_jobless_claims():
    try:
        cache_key = "jobless_claims"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})
        data = await fred_provider.get_numeric_data("ICSA")
        result = {"indicator": "jobless_claims", "data": data, "source": "FRED", "updated_at": datetime.now().isoformat()}
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/consumer-confidence", response_model=EconomicIndicatorResponse)
async def get_consumer_confidence():
    try:
        cache_key = "consumer_confidence"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})
        data = await fred_provider.get_numeric_data("UMCSENT")
        result = {"indicator": "consumer_confidence", "data": data, "source": "FRED", "updated_at": datetime.now().isoformat()}
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/retail-sales", response_model=EconomicIndicatorResponse)
async def get_retail_sales():
    try:
        cache_key = "retail_sales"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})
        data = await fred_provider.get_numeric_data("RSAFS")
        result = {"indicator": "retail_sales", "data": data, "source": "FRED", "updated_at": datetime.now().isoformat()}
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/oil-prices", response_model=EconomicIndicatorResponse)
async def get_oil_prices():
    try:
        cache_key = "oil_prices"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})
        data = await yahoo_economic.get_economic_data("CL=F")
        result = {"indicator": "oil_prices", "data": data.get("data", []) if data else [], "source": "Yahoo", "updated_at": datetime.now().isoformat()}
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/pmi", response_model=EconomicIndicatorResponse)
async def get_pmi():
    try:
        cache_key = "pmi"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})
        data = await fmp_provider.get_economic_indicator("economic", "ismManufacturingPMI")
        result = {"indicator": "pmi", "data": data if data else [], "source": "FMP", "updated_at": datetime.now().isoformat()}
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        return EconomicIndicatorResponse(indicator="pmi", data=[], source="Error", updated_at=datetime.now().isoformat())

@router.get("/options-flow", response_model=EconomicIndicatorResponse)
async def get_options_flow():
    return EconomicIndicatorResponse(
        indicator="options_flow",
        data=[{"symbol": "SPY", "type": "call", "strike": 450, "sentiment": "bullish"}],
        source="Sample",
        updated_at=datetime.now().isoformat()
    )
