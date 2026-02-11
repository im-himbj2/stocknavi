"""
Yahoo Finance API를 통한 주식 데이터 수집 모듈
"""
import yfinance as yf
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import pandas as pd


class YahooFinanceDataProvider:
    """Yahoo Finance를 통한 주식 데이터 제공자"""
    
    def __init__(self):
        self.name = "Yahoo Finance"
    
    def get_candles(
        self,
        symbol: str,
        interval: str = "1d",
        limit: int = 100
    ) -> List[Dict]:
        """
        주식 캔들 데이터 조회
        
        Args:
            symbol: 주식 심볼 (예: 'AAPL', 'MSFT')
            interval: 시간 간격 ('1d', '1wk', '1mo')
            limit: 조회할 캔들 수
        
        Returns:
            캔들 데이터 리스트
        """
        try:
            # yfinance interval 매핑
            interval_map = {
                '1d': '1d',
                '1w': '1wk',
                '1mo': '1mo',
                '1h': '1h',
                '5m': '5m',
                '15m': '15m',
                '1m': '1m'
            }
            
            yf_interval = interval_map.get(interval, '1d')
            
            # yfinance는 일부 간격에 제한이 있음
            if yf_interval in ['1h', '5m', '15m', '1m']:
                period = "60d"
            elif yf_interval == '1d':
                period = "1y"
            else:
                period = "5y"
            
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=yf_interval)
            
            if df.empty:
                return []
            
            # 최근 limit개만 반환
            df = df.tail(limit)
            
            candles = []
            for idx, row in df.iterrows():
                candles.append({
                    'timestamp': int(idx.timestamp() * 1000),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume'])
                })
            
            return candles
            
        except Exception as e:
            print(f"[YahooFinance] Error fetching data for {symbol}: {e}")
            return []
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """현재 가격 조회"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            return float(info.get('lastPrice', 0))
        except Exception as e:
            print(f"[YahooFinance] Error fetching price for {symbol}: {e}")
            return None

    def get_current_prices_batch(self, symbols: List[str]) -> Dict[str, Dict[str, float]]:
        """여러 종목의 현재 가격 및 등락률을 대량으로 조회"""
        try:
            if not symbols:
                return {}
            
            # yfinance download를 사용하여 최근 데이터 가져오기 (전일 종가 비교를 위해 5일치)
            data = yf.download(symbols, period="5d", interval="1d", progress=False)
            
            quotes = {}
            if data.empty:
                return {}
            
            for symbol in symbols:
                try:
                    # 데이터가 여러 열일 경우 (멀티 인덱스)
                    if isinstance(data.columns, pd.MultiIndex):
                        if symbol in data['Close'].columns:
                            closes = data['Close'][symbol].dropna()
                            if len(closes) > 0:
                                current_price = float(closes.iloc[-1])
                                
                                # 등락률 계산
                                change = 0.0
                                change_percent = 0.0
                                if len(closes) >= 2:
                                    prev_close = float(closes.iloc[-2])
                                    if prev_close > 0:
                                        change = current_price - prev_close
                                        change_percent = (change / prev_close) * 100
                                
                                quotes[symbol] = {
                                    "price": current_price,
                                    "change": change,
                                    "changePercent": change_percent
                                }
                    else:
                        # 단일 종목인 경우
                        closes = data['Close'].dropna()
                        if len(closes) > 0:
                            current_price = float(closes.iloc[-1])
                            
                            change = 0.0
                            change_percent = 0.0
                            if len(closes) >= 2:
                                prev_close = float(closes.iloc[-2])
                                if prev_close > 0:
                                    change = current_price - prev_close
                                    change_percent = (change / prev_close) * 100
                            
                            quotes[symbol] = {
                                "price": current_price,
                                "change": change,
                                "changePercent": change_percent
                            }

                except Exception as e:
                    print(f"[YahooFinance] Error processing {symbol}: {e}")
                    continue
            
            return quotes
        except Exception as e:
            print(f"[YahooFinance] Error in batch price fetch: {e}")
            return {}
    
    def get_company_info(self, symbol: str) -> Optional[Dict]:
        """회사 정보 조회"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            return {
                'symbol': symbol,
                'name': info.get('longName', info.get('shortName', symbol)),
                'sector': info.get('sector', ''),
                'industry': info.get('industry', ''),
                'market_cap': info.get('marketCap', 0),
                'description': info.get('longBusinessSummary', ''),
            }
        except Exception as e:
            print(f"[YahooFinance] Error fetching company info for {symbol}: {e}")
            return None
    
    def get_dividend_data(self, symbol: str) -> Optional[Dict]:
        """배당 데이터 조회"""
        try:
            ticker = yf.Ticker(symbol)
            dividends = ticker.dividends
            
            if dividends.empty:
                return None
            
            return {
                'dividend_yield': ticker.info.get('dividendYield', 0),
                'dividend_rate': ticker.info.get('dividendRate', 0),
                'dividend_history': [
                    {
                        'date': date.strftime('%Y-%m-%d'),
                        'amount': float(amount)
                    }
                    for date, amount in dividends.tail(12).items()
                ]
            }
        except Exception as e:
            print(f"[YahooFinance] Error fetching dividend data for {symbol}: {e}")
            return None

