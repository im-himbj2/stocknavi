"""
Investment Intelligence Dashboard — Smart Money Tracker, Theme Heatmap, AI Signals
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor
import httpx
import pandas as pd
import numpy as np
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import os

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ===== Pydantic Models =====

class SmartMoneyItem(BaseModel):
    rank: int
    ticker: str
    name: str
    price: float
    change_pct: float
    score: float
    foreign_net: int
    institution_net: int
    vol_surge_pct: float


class SmartMoneyResponse(BaseModel):
    items: List[SmartMoneyItem]
    updated_at: str


class ThemeStock(BaseModel):
    ticker: str
    name: str
    change_pct: float


class ThemeItem(BaseModel):
    name: str
    change_pct: float
    weight: float  # 시가총액 비중
    stocks: List[ThemeStock]


class ThemeHeatmapResponse(BaseModel):
    themes: List[ThemeItem]
    updated_at: str


class AISignal(BaseModel):
    symbol: str
    name: str
    price: float
    signal: str  # "buy" | "watch" | "caution"
    comment: str
    confidence: int  # 0-100
    rsi: float
    updated_at: str


class AISignalsResponse(BaseModel):
    signals: List[AISignal]


# ===== Theme Definition =====

THEMES = {
    "반도체": ["005930", "000660", "000990", "042700", "058470"],
    "2차전지": ["006400", "373220", "051910", "003670", "096770"],
    "바이오": ["068270", "207940", "000100", "326030"],
    "K-뷰티": ["051900", "090430", "097950", "161890"],
    "자동차": ["005380", "000270", "012330", "204320"],
    "게임": ["036570", "251270", "041460", "112040"],
    "금융": ["105560", "055550", "086790", "316140"],
    "에너지": ["010950", "267250", "011170"],
    "항공": ["003490", "020560"],
    "방산": ["047050", "012450", "064350"],
}

# ===== Cache (TTL Dict) =====

_cache: Dict[str, tuple] = {}  # {key: (value, timestamp)}


def _get_cached(key: str, ttl_sec: int = 1800) -> Optional[Any]:
    """TTL 기반 캐시 조회"""
    if key not in _cache:
        return None
    value, timestamp = _cache[key]
    if datetime.now().timestamp() - timestamp > ttl_sec:
        del _cache[key]
        return None
    return value


def _set_cached(key: str, value: Any):
    """캐시 저장"""
    _cache[key] = (value, datetime.now().timestamp())


# ===== Endpoint 1: Smart Money Tracker =====

async def _fetch_smart_money() -> List[SmartMoneyItem]:
    """pykrx로 외국인+기관 동시 순매수 상위 종목 조회"""

    def _sync_fetch():
        from pykrx import stock

        # 오늘, 어제 (영업일)
        today = datetime.now()
        end_dt = today.strftime("%Y%m%d")
        start_dt = (today - timedelta(days=4)).strftime("%Y%m%d")  # 주말 포함

        items = []
        try:
            # KOSPI 전 종목 수급 데이터 (오늘)
            df_kospi_today = stock.get_market_trading_value_by_ticker(end_dt, market="KOSPI")
            # KOSDAQ 추가
            try:
                df_kosdaq_today = stock.get_market_trading_value_by_ticker(end_dt, market="KOSDAQ")
                df_today = pd.concat([df_kospi_today, df_kosdaq_today])
            except:
                df_today = df_kospi_today

            # 어제 수급 데이터
            yesterday_str = (today - timedelta(days=1)).strftime("%Y%m%d")
            try:
                df_kospi_yesterday = stock.get_market_trading_value_by_ticker(yesterday_str, market="KOSPI")
                df_kosdaq_yesterday = stock.get_market_trading_value_by_ticker(yesterday_str, market="KOSDAQ")
                df_yesterday = pd.concat([df_kospi_yesterday, df_kosdaq_yesterday])
            except:
                try:
                    df_kospi_yesterday = stock.get_market_trading_value_by_ticker(yesterday_str, market="KOSPI")
                    df_yesterday = df_kospi_yesterday
                except:
                    df_yesterday = df_today.copy()
                    df_yesterday[:] = 0

            # 필터: 외국인합계 > 0 AND 기관합계 > 0
            mask = (df_today.get("외국인합계", pd.Series()) > 0) & (df_today.get("기관합계", pd.Series()) > 0)
            df_filtered = df_today[mask]

            if df_filtered.empty:
                return items

            # 거래량 급증률 계산
            df_ohlcv_today = stock.get_market_ohlcv_by_ticker(end_dt)
            df_ohlcv_yesterday = stock.get_market_ohlcv_by_ticker(yesterday_str)

            # 복합 스코어 계산
            for ticker in df_filtered.index[:20]:  # 상위 20개
                try:
                    foreign_net = float(df_filtered.loc[ticker, "외국인합계"])
                    inst_net = float(df_filtered.loc[ticker, "기관합계"])

                    # 회사명
                    try:
                        name = stock.get_market_ticker_name(ticker)
                    except:
                        name = ticker

                    # 현재가, 등락률
                    if ticker in df_ohlcv_today.index:
                        price = float(df_ohlcv_today.loc[ticker, "Close"])
                        change_pct = float(df_ohlcv_today.loc[ticker, "Change"] / 100) if "Change" in df_ohlcv_today.columns else 0
                    else:
                        price = 0
                        change_pct = 0

                    # 거래량 급증률
                    vol_today = float(df_ohlcv_today.loc[ticker, "Volume"]) if ticker in df_ohlcv_today.index else 0
                    vol_yesterday = float(df_ohlcv_yesterday.loc[ticker, "Volume"]) if ticker in df_ohlcv_yesterday.index else 1
                    vol_surge_pct = (vol_today / vol_yesterday - 1) * 100 if vol_yesterday > 0 else 0

                    # 복합 스코어 (정규화)
                    score = (foreign_net + inst_net) / 1e9  # 단위 정규화

                    items.append({
                        "ticker": ticker,
                        "name": name,
                        "price": price,
                        "change_pct": change_pct,
                        "score": score,
                        "foreign_net": int(foreign_net),
                        "institution_net": int(inst_net),
                        "vol_surge_pct": vol_surge_pct,
                    })
                except Exception as e:
                    print(f"[SmartMoney] Error processing {ticker}: {e}")
                    continue

        except Exception as e:
            print(f"[SmartMoney] pykrx error: {e}")

        return items

    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as pool:
        items = await loop.run_in_executor(pool, _sync_fetch)

    # 스코어 기준 정렬 및 랭킹 추가
    items_sorted = sorted(items, key=lambda x: x["score"], reverse=True)[:15]
    for rank, item in enumerate(items_sorted, 1):
        item["rank"] = rank

    return [SmartMoneyItem(**item) for item in items_sorted]


@router.get("/smart-money", response_model=SmartMoneyResponse)
async def get_smart_money():
    """스마트머니 트래커 — 외국인+기관 동시 순매수 TOP 15"""
    cache_key = "smart_money"
    cached = _get_cached(cache_key, ttl_sec=1800)  # 30분

    if cached:
        return cached

    items = await _fetch_smart_money()
    response = SmartMoneyResponse(
        items=items,
        updated_at=datetime.now().isoformat()
    )
    _set_cached(cache_key, response)
    return response


# ===== Endpoint 2: Theme Heatmap =====

async def _fetch_theme_heatmap() -> List[ThemeItem]:
    """테마별 등락률 계산"""

    def _sync_fetch():
        from pykrx import stock

        today = datetime.now().strftime("%Y%m%d")
        items = []

        try:
            # KOSPI 전 종목 데이터 (오늘)
            df_kospi = stock.get_market_ohlcv_by_ticker(today, market="KOSPI")
            try:
                df_kosdaq = stock.get_market_ohlcv_by_ticker(today, market="KOSDAQ")
                df_all = pd.concat([df_kospi, df_kosdaq])
            except:
                df_all = df_kospi

            for theme_name, tickers in THEMES.items():
                theme_data = []
                total_marketcap = 0

                for ticker in tickers:
                    try:
                        if ticker not in df_all.index:
                            continue

                        row = df_all.loc[ticker]
                        close = float(row.get("Close", 0))
                        change = float(row.get("Change", 0)) / 100 if "Change" in row else 0

                        # 회사명
                        try:
                            name = stock.get_market_ticker_name(ticker)
                        except:
                            name = ticker

                        theme_data.append({
                            "ticker": ticker,
                            "name": name,
                            "change_pct": change,
                            "close": close,
                        })
                        total_marketcap += close  # 간략화 (실제 시가총액 대신 종가 사용)
                    except Exception as e:
                        print(f"[ThemeHeatmap] Error processing {ticker}: {e}")
                        continue

                if theme_data:
                    avg_change = np.mean([d["change_pct"] for d in theme_data])
                    weight = total_marketcap / 1000 if total_marketcap > 0 else 1.0
                    items.append({
                        "name": theme_name,
                        "change_pct": avg_change,
                        "weight": weight,
                        "stocks": [ThemeStock(**d) for d in theme_data],
                    })

        except Exception as e:
            print(f"[ThemeHeatmap] pykrx error: {e}")

        return items

    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as pool:
        items = await loop.run_in_executor(pool, _sync_fetch)

    return items


@router.get("/theme-heatmap", response_model=ThemeHeatmapResponse)
async def get_theme_heatmap():
    """테마 히트맵 — 10개 테마 등락률"""
    cache_key = "theme_heatmap"
    cached = _get_cached(cache_key, ttl_sec=3600)  # 60분

    if cached:
        return cached

    themes = await _fetch_theme_heatmap()
    response = ThemeHeatmapResponse(
        themes=themes,
        updated_at=datetime.now().isoformat()
    )
    _set_cached(cache_key, response)
    return response


# ===== Endpoint 3: AI Signals =====

def _calculate_technical_indicators(ticker: str) -> Dict[str, Any]:
    """기술적 지표 계산 (RSI, MACD, MA)"""
    try:
        # yfinance 종목코드 변환
        if ticker.isdigit():
            yf_ticker = ticker + ".KS"  # 한국 종목
        else:
            yf_ticker = ticker

        data = yf.download(yf_ticker, period="6mo", progress=False)
        if data is None or data.empty:
            return None

        # RSI (14)
        delta = data['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        rsi_value = float(rsi.iloc[-1]) if not rsi.empty and pd.notna(rsi.iloc[-1]) else 50.0

        # MACD
        ema12 = data['Close'].ewm(span=12, adjust=False).mean()
        ema26 = data['Close'].ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        histogram = macd_line - signal_line

        macd_value = float(macd_line.iloc[-1]) if not macd_line.empty and pd.notna(macd_line.iloc[-1]) else 0.0
        hist_value = float(histogram.iloc[-1]) if not histogram.empty and pd.notna(histogram.iloc[-1]) else 0.0

        # MA (5, 20)
        current_price = float(data['Close'].iloc[-1])
        ma5 = float(data['Close'].rolling(window=5).mean().iloc[-1]) if len(data) >= 5 else current_price
        ma20 = float(data['Close'].rolling(window=20).mean().iloc[-1]) if len(data) >= 20 else current_price

        return {
            "rsi": rsi_value,
            "macd": macd_value,
            "histogram": hist_value,
            "ma5": ma5,
            "ma20": ma20,
            "current_price": current_price,
        }
    except Exception as e:
        print(f"[AISignals] Technical indicator error for {ticker}: {e}")
        return None


async def _get_ai_signal(symbol: str, indicators: Dict[str, Any]) -> Optional[AISignal]:
    """Groq AI로 매수/매도 시그널 생성"""
    if not GROQ_API_KEY or not indicators:
        return None

    try:
        # 기본 정보
        ticker = symbol if not symbol.isdigit() else symbol + ".KS"
        data = yf.Ticker(ticker)
        name = data.info.get("shortName", symbol)
        price = indicators.get("current_price", 0)
        rsi = indicators.get("rsi", 50)

        # Groq 프롬프트
        prompt = f"""
종목: {name} ({symbol})
현재가: {price}
RSI(14): {rsi:.1f}
MA5 vs MA20: {'골든크로스' if indicators['ma5'] > indicators['ma20'] else '데드크로스'}
MACD: {'양수(상승)' if indicators['macd'] > 0 else '음수(하락)'}

위 기술적 지표를 바탕으로 단기(1-2주) 투자 시그널을 결정하세요.
한국어로 1문장 논평을 작성하고, 다음 JSON 형식으로 응답하세요:
{{"signal": "buy|watch|caution", "comment": "...", "confidence": 0-100}}

한국 주식이면 PER, 배당, 거래량도 고려하세요.
"""

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 200,
                }
            )

        if resp.status_code != 200:
            print(f"[AISignals] Groq error {resp.status_code}: {resp.text}")
            return None

        result = resp.json()
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")

        # JSON 파싱
        import json
        try:
            # JSON 추출
            json_start = content.find("{")
            json_end = content.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = content[json_start:json_end]
                data = json.loads(json_str)
                return AISignal(
                    symbol=symbol,
                    name=name,
                    price=price,
                    signal=data.get("signal", "watch"),
                    comment=data.get("comment", ""),
                    confidence=int(data.get("confidence", 50)),
                    rsi=rsi,
                    updated_at=datetime.now().isoformat(),
                )
        except json.JSONDecodeError:
            print(f"[AISignals] JSON parse error for {symbol}")
            return None

    except Exception as e:
        print(f"[AISignals] Groq error for {symbol}: {e}")
        return None


@router.get("/ai-signals", response_model=AISignalsResponse)
async def get_ai_signals(symbols: str = Query("005930,000660,AAPL,MSFT")):
    """AI 매수/매도 시그널 (기술적 지표 + Groq)"""
    cache_key = f"ai_signals_{symbols}"
    cached = _get_cached(cache_key, ttl_sec=3600)  # 60분

    if cached:
        return cached

    symbol_list = [s.strip().upper() for s in symbols.split(",")][:10]  # 최대 10개
    signals = []

    for symbol in symbol_list:
        try:
            indicators = _calculate_technical_indicators(symbol)
            if indicators:
                signal = await _get_ai_signal(symbol, indicators)
                if signal:
                    signals.append(signal)
        except Exception as e:
            print(f"[AISignals] Error processing {symbol}: {e}")
            continue

    response = AISignalsResponse(signals=signals)
    _set_cached(cache_key, response)
    return response
