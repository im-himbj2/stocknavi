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

# ── Helper: Stooq CSV 조회 (API 키 불필요, 광범위한 글로벌 데이터) ─────────
async def _fetch_stooq(client: httpx.AsyncClient, symbol: str, d1: str = None) -> Optional[Dict]:
    """Stooq에서 종가 + 전일 대비 % 변화 조회"""
    try:
        params = {"s": symbol, "i": "d"}
        if d1:
            params["d1"] = d1  # YYYYMMDD 형식 시작 날짜
        resp = await client.get(
            "https://stooq.com/q/d/l/",
            params=params,
            timeout=10.0,
            follow_redirects=True,
        )
        if resp.status_code != 200:
            return None
        text = resp.text.strip()
        if not text or "No data" in text or len(text.splitlines()) < 3:
            return None
        import csv, io
        rows = sorted(list(csv.DictReader(io.StringIO(text))), key=lambda r: r.get("Date", ""))
        if len(rows) < 2:
            return None
        latest, prev = rows[-1], rows[-2]
        close = float(latest.get("Close") or 0)
        prev_close = float(prev.get("Close") or 0)
        if close == 0 or prev_close == 0:
            return None
        return {
            "close": round(close, 2),
            "change_percent": round((close - prev_close) / prev_close * 100, 2),
            "first_close": round(float(rows[0].get("Close") or close), 2),  # 1개월 변화 계산용
            "date": latest.get("Date", ""),
        }
    except Exception:
        return None

# ── Helper: FRED 공공 시리즈 최신 값 (공공 데이터 전용 직접 조회) ──────────
async def _fetch_fred_latest(series_id: str) -> Optional[float]:
    """FRED 공공 시리즈 최근 단일 값 조회 (저작권 검사 생략)"""
    if not fred_provider.api_key:
        return None
    try:
        start = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
        async with httpx.AsyncClient() as c:
            resp = await c.get(
                "https://api.stlouisfed.org/fred/series/observations",
                params={
                    "series_id": series_id,
                    "api_key": fred_provider.api_key,
                    "file_type": "json",
                    "observation_start": start,
                    "sort_order": "desc",
                    "limit": 5,
                },
                timeout=10.0,
            )
        if resp.status_code != 200:
            return None
        obs = [float(o["value"]) for o in resp.json().get("observations", []) if o["value"] != "."]
        return obs[0] if obs else None
    except Exception:
        return None

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
    # 표시할 5개 지수만 필터
    TARGET_SYMBOLS = {
        'KS11':  '코스피',
        'KQ11':  '코스닥',
        'IXIC':  '나스닥',
        'GSPC':  'S&P500',
        'DJI':   '다우',
    }
    try:
        cache_key = "market_indices"
        cached = get_cached(cache_key)
        if cached:
            return EconomicIndicatorResponse(**{**cached, "cached": True})

        data = await fmp_provider.get_market_indices()
        if data:
            # FMP는 changesPercentage 필드로 제공 → changePercent로 정규화 + 5개만 필터
            filtered = []
            for item in data:
                sym = item.get('symbol', '').lstrip('^')
                if sym in TARGET_SYMBOLS:
                    filtered.append({
                        'symbol': sym,
                        'name': TARGET_SYMBOLS[sym],
                        'price': item.get('price', 0),
                        'change': item.get('change', 0),
                        'changePercent': item.get('changesPercentage', item.get('changePercent', 0)),
                    })
            # 지정 순서대로 정렬
            order = list(TARGET_SYMBOLS.keys())
            data = sorted(filtered, key=lambda x: order.index(x['symbol']) if x['symbol'] in order else 99)

        if not data:
            # Fallback: Stooq (API 키 불필요)
            stooq_map = {
                "^SPX": "GSPC", "^NDQ": "IXIC", "^DJI": "DJI",
            }
            async with httpx.AsyncClient() as client:
                stooq_results = await asyncio.gather(*[_fetch_stooq(client, s) for s in stooq_map])
            data = []
            for stooq_sym, res in zip(stooq_map, stooq_results):
                sym = stooq_map[stooq_sym]
                if res and sym in TARGET_SYMBOLS:
                    data.append({
                        "symbol": sym,
                        "name": TARGET_SYMBOLS[sym],
                        "price": res["close"],
                        "change": 0,
                        "changePercent": res["change_percent"],
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
    """국채 수익률 조회 (FRED 공공 데이터)"""
    try:
        cache_key = f"treasury_yahoo_{maturity}"
        cached = get_cached(cache_key)
        if cached: return cached

        series_map = {"3m": "DGS3MO", "5y": "DGS5", "10y": "DGS10", "30y": "DGS30"}
        series_id = series_map.get(maturity, "DGS10")
        value = await _fetch_fred_latest(series_id)

        result = {
            "indicator": f"treasury_{maturity}",
            "current_value": value,
            "data": [{"date": datetime.now().strftime("%Y-%m-%d"), "value": value}] if value else [],
            "source": "FRED",
            "updated_at": datetime.now().isoformat(),
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

        # FMP 실패 시 Yahoo Finance fallback (^IRX = 13주 T-bill ≈ Fed Funds Rate)
        names_found = {item["name"] for item in combined_data}
        if "interestRate" not in names_found:
            try:
                irx = await yahoo_economic.get_economic_data("^IRX")
                if irx and irx.get("current_value"):
                    combined_data.append({
                        "name": "interestRate",
                        "value": round(float(irx["current_value"]), 2),
                        "date": datetime.now().strftime("%Y-%m-%d"),
                    })
            except Exception:
                pass

        result = {
            "indicator": "macro_highlights",
            "data": combined_data,
            "source": "FMP/Yahoo",
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
    """섹터 ETF 1개월 성과 (Stooq — API 키 불필요)"""
    try:
        cache_key = "sector_rotation"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})

        SECTOR_ETFS = {
            "XLK": "Tech", "XLV": "Health", "XLE": "Energy", "XLF": "Finance",
            "XLI": "Industrials", "XLY": "ConsDis", "XLP": "ConsStap",
            "XLU": "Utilities", "XLB": "Materials", "XLRE": "RealEstate", "XLC": "Comm",
        }
        d1 = (datetime.now() - timedelta(days=45)).strftime("%Y%m%d")

        async with httpx.AsyncClient() as client:
            tasks = [_fetch_stooq(client, sym, d1=d1) for sym in SECTOR_ETFS]
            results = await asyncio.gather(*tasks)

        sector_data = []
        for sym, res in zip(SECTOR_ETFS, results):
            if res and res["first_close"] > 0:
                chg = (res["close"] - res["first_close"]) / res["first_close"] * 100
                sector_data.append({"symbol": sym, "name": SECTOR_ETFS[sym], "change_percent": round(chg, 2)})

        sector_data.sort(key=lambda x: x["change_percent"], reverse=True)
        result = {"indicator": "sector_rotation", "data": sector_data, "source": "Stooq", "updated_at": datetime.now().isoformat()}
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
        fred_data = await fred_provider.get_series("ICSA")
        data = fred_data.get('observations', []) if fred_data else []
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
        fred_data = await fred_provider.get_series("UMCSENT")
        data = fred_data.get('observations', []) if fred_data else []
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
        fred_data = await fred_provider.get_series("RSAFS")
        data = fred_data.get('observations', []) if fred_data else []
        result = {"indicator": "retail_sales", "data": data, "source": "FRED", "updated_at": datetime.now().isoformat()}
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/oil-prices", response_model=EconomicIndicatorResponse)
async def get_oil_prices():
    """WTI 원유 가격 (FRED 공공 데이터)"""
    try:
        cache_key = "oil_prices"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})
        value = await _fetch_fred_latest("DCOILWTICO")
        data = [{"date": datetime.now().strftime("%Y-%m-%d"), "value": value}] if value else []
        result = {"indicator": "oil_prices", "data": data, "source": "FRED", "updated_at": datetime.now().isoformat()}
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

@router.get("/economic/global-indices", response_model=EconomicIndicatorResponse)
async def get_global_indices():
    """글로벌 주요 지수 (Stooq — API 키 불필요)"""
    try:
        cache_key = "global_indices"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})

        # Stooq 심볼 → (표시명, 지역)
        INDICES = {
            "^SPX": ("S&P 500",     "US"),
            "^NDQ": ("NASDAQ 100",  "US"),
            "^DJI": ("Dow Jones",   "US"),
            "^RUT": ("Russell 2000","US"),
            "^NKX": ("Nikkei 225",  "Japan"),
            "^UKX": ("FTSE 100",    "UK"),
            "^DAX": ("DAX",         "Germany"),
            "^CAC": ("CAC 40",      "France"),
            "^HSI": ("Hang Seng",   "HK"),
            "^SHC": ("Shanghai",    "China"),
        }

        async with httpx.AsyncClient() as client:
            tasks = [_fetch_stooq(client, sym) for sym in INDICES]
            results = await asyncio.gather(*tasks)

        indices_data = []
        for sym, res in zip(INDICES, results):
            if res:
                name, region = INDICES[sym]
                indices_data.append({
                    "symbol": sym.lstrip("^"),
                    "name": name,
                    "region": region,
                    "price": res["close"],
                    "change": 0,
                    "change_percent": res["change_percent"],
                })

        result = {"indicator": "global_indices", "data": indices_data, "source": "Stooq", "updated_at": datetime.now().isoformat()}
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/commodities", response_model=EconomicIndicatorResponse)
async def get_commodities():
    """주요 원자재 가격 (FRED 공공 데이터 — WTI·Brent·천연가스)"""
    try:
        cache_key = "commodities"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})

        # FRED 공공 시리즈 ID (모두 공공 도메인)
        FRED_SERIES = {
            "DCOILWTICO":  {"name": "WTI Crude",   "unit": "$/bbl"},
            "DCOILBRENTEU":{"name": "Brent Crude",  "unit": "$/bbl"},
            "DHHNGSP":     {"name": "Natural Gas",  "unit": "$/MMBtu"},
        }

        tasks = [_fetch_fred_latest(sid) for sid in FRED_SERIES]
        values = await asyncio.gather(*tasks)

        commodities_data = []
        for sid, val in zip(FRED_SERIES, values):
            if val is not None:
                meta = FRED_SERIES[sid]
                commodities_data.append({
                    "symbol": sid,
                    "name": meta["name"],
                    "unit": meta["unit"],
                    "price": round(val, 2),
                    "change_percent": None,  # FRED 일별 데이터에서 전일 대비 계산 생략
                })

        result = {"indicator": "commodities", "data": commodities_data, "source": "FRED", "updated_at": datetime.now().isoformat()}
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/crypto", response_model=EconomicIndicatorResponse)
async def get_crypto_prices():
    """암호화폐 실시간 가격 (Binance Public API — API 키 불필요)"""
    try:
        cache_key = "crypto_prices"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})

        import json as _json
        SYMBOLS = {
            "BTCUSDT": ("BTC", "Bitcoin"),
            "ETHUSDT": ("ETH", "Ethereum"),
            "BNBUSDT": ("BNB", "BNB"),
            "SOLUSDT": ("SOL", "Solana"),
        }

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.binance.com/api/v3/ticker/24hr",
                params={"symbols": _json.dumps(list(SYMBOLS.keys()))},
                timeout=10.0,
            )

        crypto_data = []
        if resp.status_code == 200:
            for item in resp.json():
                sym = item.get("symbol")
                if sym in SYMBOLS:
                    short, name = SYMBOLS[sym]
                    crypto_data.append({
                        "symbol": short,
                        "name": name,
                        "price": round(float(item["lastPrice"]), 2),
                        "change_percent": round(float(item["priceChangePercent"]), 2),
                    })

        result = {"indicator": "crypto_prices", "data": crypto_data, "source": "Binance", "updated_at": datetime.now().isoformat()}
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/forex", response_model=EconomicIndicatorResponse)
async def get_forex_rates():
    """주요 외환 환율 (Frankfurter ECB 데이터 — API 키 불필요)"""
    try:
        cache_key = "forex_rates"
        cached = get_cached(cache_key)
        if cached: return EconomicIndicatorResponse(**{**cached, "cached": True})

        # 최근 7일 시계열 → 마지막 2개 영업일 비교
        start = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        end = datetime.now().strftime("%Y-%m-%d")
        currencies = "USD,GBP,JPY,KRW,CNY,CHF,AUD"

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.frankfurter.app/{start}..{end}",
                params={"from": "EUR", "to": currencies},
                timeout=10.0,
            )

        forex_data = []
        if resp.status_code == 200:
            data = resp.json()
            dates = sorted(data.get("rates", {}).keys())
            if len(dates) >= 2:
                L = data["rates"][dates[-1]]
                P = data["rates"][dates[-2]]

                def _pct(r, p):
                    return round((r - p) / p * 100, 4) if p else 0

                # Frankfurter base=EUR, so L["USD"] = EUR/USD directly
                eu = L.get("USD"); pu = P.get("USD")
                if eu and pu:
                    forex_data.append({"symbol": "EUR/USD", "rate": round(eu, 4), "change_percent": _pct(eu, pu)})
                    eg = L.get("GBP"); pg = P.get("GBP")
                    if eg and pg:
                        forex_data.append({"symbol": "GBP/USD", "rate": round(eu / eg, 4), "change_percent": _pct(eu / eg, pu / pg)})
                    ej = L.get("JPY"); pj = P.get("JPY")
                    if ej and pj:
                        forex_data.append({"symbol": "USD/JPY", "rate": round(ej / eu, 2), "change_percent": _pct(ej / eu, pj / pu)})
                    ek = L.get("KRW"); pk = P.get("KRW")
                    if ek and pk:
                        forex_data.append({"symbol": "USD/KRW", "rate": round(ek / eu, 2), "change_percent": _pct(ek / eu, pk / pu)})
                    ec = L.get("CNY"); pc = P.get("CNY")
                    if ec and pc:
                        forex_data.append({"symbol": "USD/CNY", "rate": round(ec / eu, 4), "change_percent": _pct(ec / eu, pc / pu)})
                    ef = L.get("CHF"); pf = P.get("CHF")
                    if ef and pf:
                        forex_data.append({"symbol": "USD/CHF", "rate": round(ef / eu, 4), "change_percent": _pct(ef / eu, pf / pu)})
                    ea = L.get("AUD"); pa = P.get("AUD")
                    if ea and pa:
                        forex_data.append({"symbol": "AUD/USD", "rate": round(eu / ea, 4), "change_percent": _pct(eu / ea, pu / pa)})

        result = {"indicator": "forex_rates", "data": forex_data, "source": "Frankfurter/ECB", "updated_at": datetime.now().isoformat()}
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/economic/yield-curve")
async def get_yield_curve():
    """국채 수익률 곡선 (FRED 공공 데이터 — 3M/5Y/10Y/30Y)"""
    try:
        cache_key = "yield_curve"
        cached = get_cached(cache_key)
        if cached: return cached

        # DGS* 시리즈: Federal Reserve 공공 데이터
        MATURITIES = [
            ("DGS3MO", "3M", 0),
            ("DGS5",   "5Y", 1),
            ("DGS10",  "10Y",2),
            ("DGS30",  "30Y",3),
        ]
        values = await asyncio.gather(*[_fetch_fred_latest(sid) for sid, _, _ in MATURITIES])

        curve_data = [
            {"maturity": label, "yield": round(val, 3), "sort_order": order}
            for (sid, label, order), val in zip(MATURITIES, values)
            if val is not None
        ]

        result_obj = {"indicator": "yield_curve", "data": curve_data, "source": "FRED", "updated_at": datetime.now().isoformat()}
        set_cached(cache_key, result_obj)
        return result_obj
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
