"""
Alpha Vantage API를 통한 주식 데이터 수집 모듈
"""
import httpx
import pandas as pd
from typing import List, Optional, Dict
from app.core.config import settings


class AlphaVantageDataProvider:
    """Alpha Vantage API를 통한 주식 데이터 제공자"""
    
    def __init__(self):
        self.name = "Alpha Vantage"
        self.api_key = settings.ALPHA_VANTAGE_API_KEY
        self.base_url = "https://www.alphavantage.co/query"
    
    async def get_candles(
        self,
        symbol: str,
        interval: str = "daily",
        limit: int = 100
    ) -> List[Dict]:
        """
        주식 캔들 데이터 조회
        
        Args:
            symbol: 주식 심볼
            interval: 'daily', 'weekly', 'monthly', '1min', '5min', '15min', '30min', '60min'
            limit: 조회할 캔들 수
        
        Returns:
            캔들 데이터 리스트
        """
        if not self.api_key:
            return []
        
        try:
            function = "TIME_SERIES_DAILY"
            if interval == "weekly":
                function = "TIME_SERIES_WEEKLY"
            elif interval == "monthly":
                function = "TIME_SERIES_MONTHLY"
            elif interval in ["1min", "5min", "15min", "30min", "60min"]:
                function = f"TIME_SERIES_INTRADAY&interval={interval}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.base_url,
                    params={
                        "function": function,
                        "symbol": symbol,
                        "apikey": self.api_key,
                        "outputsize": "compact" if limit <= 100 else "full"
                    },
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    return []
                
                data = response.json()
                
                # Alpha Vantage 응답 형식에 따라 파싱
                time_series_key = None
                for key in data.keys():
                    if "Time Series" in key:
                        time_series_key = key
                        break
                
                if not time_series_key:
                    return []
                
                time_series = data[time_series_key]
                candles = []
                
                for date_str, values in list(time_series.items())[:limit]:
                    candles.append({
                        'timestamp': int(pd.Timestamp(date_str).timestamp() * 1000),
                        'open': float(values['1. open']),
                        'high': float(values['2. high']),
                        'low': float(values['3. low']),
                        'close': float(values['4. close']),
                        'volume': int(values['5. volume'])
                    })
                
                # 최신순으로 정렬
                candles.reverse()
                return candles
                
        except Exception as e:
            print(f"[AlphaVantage] Error fetching data for {symbol}: {e}")
            return []
    
    async def get_dividend_data(self, symbol: str) -> Optional[Dict]:
        """배당 데이터 조회"""
        if not self.api_key:
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.base_url,
                    params={
                        "function": "TIME_SERIES_MONTHLY_ADJUSTED",
                        "symbol": symbol,
                        "apikey": self.api_key
                    },
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                # 배당 데이터 파싱 로직 구현
                return None
                
        except Exception as e:
            print(f"[AlphaVantage] Error fetching dividend data for {symbol}: {e}")
            return None

