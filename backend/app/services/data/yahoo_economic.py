"""
Yahoo Finance 경제 지표 - 상업적 사용 가능 (무료)
"""
import yfinance as yf
from typing import List, Optional, Dict
from datetime import datetime, timedelta


class YahooEconomicProvider:
    """Yahoo Finance를 통한 경제 지표 데이터 제공자 (상업적 사용 가능)"""
    
    def __init__(self):
        self.name = "Yahoo Finance Economic"
    
    async def get_economic_data(self, symbol: str) -> Optional[Dict]:
        """
        Yahoo Finance를 통한 경제 지표 데이터 조회
        
        Args:
            symbol: 경제 지표 심볼
                - ^TNX: 10년 국채 수익률
                - ^IRX: 13주 국채 수익률
                - ^FVX: 5년 국채 수익률
                - ^TYX: 30년 국채 수익률
                - DX-Y.NYB: 달러 인덱스
                - CL=F: 원유 선물
                - GC=F: 금 선물
        
        Returns:
            경제 지표 데이터
        """
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5y")
            
            if hist.empty:
                return None
            
            info = ticker.info
            
            return {
                'symbol': symbol,
                'name': info.get('longName', symbol),
                'current_value': float(hist['Close'].iloc[-1]) if not hist.empty else None,
                'data': [
                    {
                        'date': date.strftime('%Y-%m-%d'),
                        'value': float(row['Close'])
                    }
                    for date, row in hist.iterrows()
                ]
            }
            
        except Exception as e:
            print(f"[Yahoo Economic] Error fetching {symbol}: {e}")
            return None
    
    async def get_treasury_10y(self) -> Optional[Dict]:
        """10년 국채 수익률"""
        return await self.get_economic_data("^TNX")
    
    async def get_treasury_5y(self) -> Optional[Dict]:
        """5년 국채 수익률"""
        return await self.get_economic_data("^FVX")
    
    async def get_treasury_30y(self) -> Optional[Dict]:
        """30년 국채 수익률"""
        return await self.get_economic_data("^TYX")
    
    async def get_dollar_index(self) -> Optional[Dict]:
        """달러 인덱스"""
        return await self.get_economic_data("DX-Y.NYB")
    
    async def get_oil_price(self) -> Optional[Dict]:
        """원유 가격"""
        return await self.get_economic_data("CL=F")
    
    async def get_gold_price(self) -> Optional[Dict]:
        """금 가격"""
        return await self.get_economic_data("GC=F")









