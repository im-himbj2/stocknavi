"""
Alpha Vantage 경제 지표 데이터 제공자
무료 API로 주요 경제 지표 데이터 제공
"""
import httpx
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import os


class AlphaVantageEconomicProvider:
    """Alpha Vantage 경제 지표 API"""
    
    def __init__(self):
        self.api_key = os.getenv('ALPHA_VANTAGE_API_KEY', 'demo')
        self.base_url = "https://www.alphavantage.co/query"
        
        # 주요 경제 지표 목록 (API 호출 제한 고려하여 3개만 사용)
        self.indicators = [
            {'function': 'CPI', 'name': '미국 CPI (소비자물가지수)', 'country': 'US', 'impact': 'High'},
            {'function': 'UNEMPLOYMENT', 'name': '미국 실업률', 'country': 'US', 'impact': 'High'},
            {'function': 'FEDERAL_FUNDS_RATE', 'name': 'FOMC 기준금리', 'country': 'US', 'impact': 'High'},
        ]
    
    async def get_economic_calendar(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Optional[List[Dict]]:
        """경제 캘린더 데이터 가져오기"""
        
        if not start_date:
            start_date = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = (datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d')
        
        all_events = []
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for indicator in self.indicators:
                try:
                    events = await self._fetch_indicator(
                        client, 
                        indicator,
                        start_date,
                        end_date
                    )
                    if events:
                        all_events.extend(events)
                except Exception as e:
                    error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
                    print(f"[AlphaVantage] {indicator['function']} 실패: {error_msg}")
                    continue
        
        if all_events:
            # 날짜별 정렬
            all_events.sort(key=lambda x: x['date'], reverse=True)
            print(f"[AlphaVantage] 총 {len(all_events)}개 이벤트 수신")
            return all_events
        
        return None
    
    async def _fetch_indicator(
        self,
        client: httpx.AsyncClient,
        indicator: Dict,
        start_date: str,
        end_date: str
    ) -> List[Dict]:
        """개별 경제 지표 데이터 가져오기"""
        
        params = {
            'function': indicator['function'],
            'apikey': self.api_key,
        }
        
        # 일부 지표는 interval 파라미터 필요
        if indicator['function'] in ['CPI', 'INFLATION', 'RETAIL_SALES', 'DURABLES', 'TREASURY_YIELD']:
            params['interval'] = 'monthly'
        
        response = await client.get(self.base_url, params=params)
        
        if response.status_code != 200:
            return []
        
        data = response.json()
        
        # API 제한 메시지 확인
        if 'Note' in data or 'Information' in data:
            print(f"[AlphaVantage] API 제한: {data.get('Note', data.get('Information', ''))[:100]}")
            return []
        
        # 데이터 추출
        raw_data = data.get('data', [])
        if not raw_data:
            return []
        
        events = []
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        for i, item in enumerate(raw_data):
            try:
                date_str = item.get('date', '')
                if not date_str:
                    continue
                
                event_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                
                # 날짜 범위 필터링
                if event_date < start or event_date > end:
                    continue
                
                value = item.get('value', '')
                
                # 이전 값 찾기 (다음 항목이 이전 값)
                previous_value = None
                if i + 1 < len(raw_data):
                    previous_value = raw_data[i + 1].get('value', '')
                    if previous_value == '.':
                        previous_value = None
                
                # 값이 '.'이면 None으로
                if value == '.':
                    value = None
                
                event = {
                    'event': indicator['name'],
                    'country': indicator['country'],
                    'date': date_str,
                    'time': '08:30',  # 대부분의 미국 경제 지표는 8:30 AM ET 발표
                    'impact': indicator['impact'],
                    'actual': value,
                    'forecast': None,  # Alpha Vantage는 예측값을 제공하지 않음
                    'previous': previous_value,
                }
                
                events.append(event)
                
            except Exception:
                continue
        
        return events
