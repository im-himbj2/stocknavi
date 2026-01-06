"""
경제 캘린더 데이터 수집 - 여러 소스 사용
"""
import httpx
from bs4 import BeautifulSoup
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import json
import re


class EconomicCalendarScraper:
    """여러 소스에서 경제 캘린더 데이터 수집"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/html, */*',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    
    async def get_economic_calendar(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Optional[List[Dict]]:
        """경제 캘린더 데이터 가져오기 - 여러 소스 시도"""
        
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        # 1. Myfxbook API 시도
        events = await self._fetch_myfxbook(start_date, end_date)
        if events:
            return events
        
        # 2. DailyFX 시도
        events = await self._fetch_dailyfx(start_date, end_date)
        if events:
            return events
        
        # 3. TradingView 위젯 데이터 시도
        events = await self._fetch_tradingview(start_date, end_date)
        if events:
            return events
        
        return None
    
    async def _fetch_myfxbook(self, start_date: str, end_date: str) -> Optional[List[Dict]]:
        """Myfxbook 경제 캘린더 API"""
        try:
            url = "https://www.myfxbook.com/api/get-economic-calendar.json"
            
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url, headers=self.headers)
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                
                if not data or not isinstance(data, list):
                    return None
                
                events = []
                for item in data:
                    try:
                        event_date = item.get('date', '')
                        if event_date:
                            # 날짜 형식 변환
                            try:
                                dt = datetime.strptime(event_date, '%Y-%m-%d %H:%M:%S')
                                event_date = dt.strftime('%Y-%m-%d')
                                event_time = dt.strftime('%H:%M')
                            except:
                                event_time = ''
                        
                        # 날짜 범위 필터링
                        if event_date and start_date <= event_date <= end_date:
                            impact = item.get('impact', 'medium')
                            if impact == 'high':
                                impact = 'High'
                            elif impact == 'medium':
                                impact = 'Medium'
                            else:
                                impact = 'Low'
                            
                            event = {
                                'event': item.get('title', item.get('name', '')),
                                'country': item.get('country', ''),
                                'date': event_date,
                                'time': event_time,
                                'impact': impact,
                                'actual': item.get('actual'),
                                'forecast': item.get('forecast'),
                                'previous': item.get('previous'),
                            }
                            
                            if event['event']:
                                events.append(event)
                    except Exception:
                        continue
                
                if events:
                    print(f"[Myfxbook] {len(events)}개 이벤트 수신")
                    return events
                
        except Exception as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            print(f"[Myfxbook] 실패: {error_msg}")
        
        return None
    
    async def _fetch_dailyfx(self, start_date: str, end_date: str) -> Optional[List[Dict]]:
        """DailyFX 경제 캘린더"""
        try:
            # DailyFX API 엔드포인트
            url = "https://www.dailyfx.com/api/v1/calendar"
            params = {
                'from': start_date,
                'to': end_date
            }
            
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url, params=params, headers=self.headers)
                
                if response.status_code != 200:
                    # 대체 URL 시도
                    alt_url = f"https://www.dailyfx.com/economic-calendar/events"
                    response = await client.get(alt_url, headers=self.headers)
                    if response.status_code != 200:
                        return None
                
                # JSON 응답인지 확인
                try:
                    data = response.json()
                except:
                    # HTML 파싱 시도
                    return await self._parse_dailyfx_html(response.text, start_date, end_date)
                
                if not data:
                    return None
                
                events = []
                items = data if isinstance(data, list) else data.get('events', data.get('data', []))
                
                for item in items:
                    try:
                        event_date = item.get('date', item.get('dateUtc', ''))
                        if event_date:
                            try:
                                if 'T' in event_date:
                                    dt = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                                else:
                                    dt = datetime.strptime(event_date[:10], '%Y-%m-%d')
                                event_date = dt.strftime('%Y-%m-%d')
                                event_time = dt.strftime('%H:%M') if hasattr(dt, 'hour') else ''
                            except:
                                event_time = ''
                        
                        if event_date and start_date <= event_date <= end_date:
                            impact = item.get('importance', item.get('impact', 'medium'))
                            if isinstance(impact, int):
                                if impact >= 3:
                                    impact = 'High'
                                elif impact >= 2:
                                    impact = 'Medium'
                                else:
                                    impact = 'Low'
                            elif isinstance(impact, str):
                                impact = impact.capitalize()
                            
                            event = {
                                'event': item.get('name', item.get('title', item.get('event', ''))),
                                'country': item.get('country', item.get('currency', '')),
                                'date': event_date,
                                'time': event_time,
                                'impact': impact,
                                'actual': item.get('actual'),
                                'forecast': item.get('forecast', item.get('consensus')),
                                'previous': item.get('previous', item.get('prior')),
                            }
                            
                            if event['event']:
                                events.append(event)
                    except Exception:
                        continue
                
                if events:
                    print(f"[DailyFX] {len(events)}개 이벤트 수신")
                    return events
                
        except Exception as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            print(f"[DailyFX] 실패: {error_msg}")
        
        return None
    
    async def _parse_dailyfx_html(self, html: str, start_date: str, end_date: str) -> Optional[List[Dict]]:
        """DailyFX HTML 파싱"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # JSON 데이터가 페이지에 포함되어 있는지 확인
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string and 'calendarData' in script.string:
                    match = re.search(r'calendarData\s*=\s*(\[.*?\]);', script.string, re.DOTALL)
                    if match:
                        try:
                            data = json.loads(match.group(1))
                            if isinstance(data, list):
                                return await self._process_calendar_data(data, start_date, end_date)
                        except:
                            pass
            
            return None
        except:
            return None
    
    async def _fetch_tradingview(self, start_date: str, end_date: str) -> Optional[List[Dict]]:
        """TradingView 경제 캘린더"""
        try:
            url = "https://economic-calendar.tradingview.com/events"
            params = {
                'from': start_date,
                'to': end_date,
                'countries': 'US,KR,JP,DE,GB,CN,EU'
            }
            
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url, params=params, headers=self.headers)
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                
                if not data or not isinstance(data, dict):
                    return None
                
                items = data.get('result', data.get('events', data.get('data', [])))
                if not items:
                    return None
                
                events = []
                for item in items:
                    try:
                        event_date = item.get('date', '')
                        if event_date:
                            try:
                                if isinstance(event_date, int):
                                    dt = datetime.fromtimestamp(event_date)
                                elif 'T' in event_date:
                                    dt = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                                else:
                                    dt = datetime.strptime(event_date[:10], '%Y-%m-%d')
                                event_date = dt.strftime('%Y-%m-%d')
                                event_time = dt.strftime('%H:%M')
                            except:
                                event_time = ''
                        
                        if event_date and start_date <= event_date <= end_date:
                            importance = item.get('importance', 1)
                            if isinstance(importance, int):
                                if importance >= 3:
                                    impact = 'High'
                                elif importance >= 2:
                                    impact = 'Medium'
                                else:
                                    impact = 'Low'
                            else:
                                impact = 'Medium'
                            
                            event = {
                                'event': item.get('title', item.get('name', '')),
                                'country': item.get('country', item.get('countryCode', '')),
                                'date': event_date,
                                'time': event_time,
                                'impact': impact,
                                'actual': item.get('actual'),
                                'forecast': item.get('forecast', item.get('consensus')),
                                'previous': item.get('previous'),
                            }
                            
                            if event['event']:
                                events.append(event)
                    except Exception:
                        continue
                
                if events:
                    print(f"[TradingView] {len(events)}개 이벤트 수신")
                    return events
                
        except Exception as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            print(f"[TradingView] 실패: {error_msg}")
        
        return None
    
    async def _process_calendar_data(self, data: list, start_date: str, end_date: str) -> Optional[List[Dict]]:
        """캘린더 데이터 처리"""
        events = []
        for item in data:
            try:
                event_date = item.get('date', '')[:10]
                if event_date and start_date <= event_date <= end_date:
                    events.append({
                        'event': item.get('title', item.get('name', '')),
                        'country': item.get('country', ''),
                        'date': event_date,
                        'time': item.get('time', ''),
                        'impact': item.get('impact', 'Medium'),
                        'actual': item.get('actual'),
                        'forecast': item.get('forecast'),
                        'previous': item.get('previous'),
                    })
            except:
                continue
        
        return events if events else None










