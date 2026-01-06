"""
Investing.com 경제 캘린더 스크래퍼
주 단위로 분할하여 더 정확한 데이터 수집
"""
import httpx
from bs4 import BeautifulSoup
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import re
import json
import asyncio


class InvestingCalendarScraper:
    """Investing.com 경제 캘린더 스크래퍼 - 주 단위 분할 수집"""
    
    def __init__(self):
        self.base_url = "https://www.investing.com"
        self.ajax_url = f"{self.base_url}/economic-calendar/Service/getCalendarFilteredData"
        
        # 국가 ID 매핑 (Investing.com 내부 ID)
        self.country_ids = {
            "US": 5,
            "KR": 11,
            "JP": 35,
            "CN": 37,
            "DE": 17,
            "GB": 4,
            "EU": 72,
            "FR": 22,
        }
        
        self.importance_map = {1: "Low", 2: "Medium", 3: "High"}
    
    async def get_economic_calendar(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Optional[List[Dict]]:
        """주 단위로 분할하여 경제 캘린더 데이터 수집"""
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=60)).strftime('%Y-%m-%d')
            if not end_date:
                end_date = (datetime.now() + timedelta(days=180)).strftime('%Y-%m-%d')
            
            print(f"[Investing] 경제 캘린더 수집: {start_date} ~ {end_date}")
            
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            
            # 주 단위로 분할 (더 정확한 데이터 수집)
            all_events = []
            current = start_dt
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
            
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                # 1. 메인 페이지에서 쿠키 획득
                try:
                    main_response = await client.get(
                        f"{self.base_url}/economic-calendar/",
                        headers=headers
                    )
                    cookies = dict(main_response.cookies) if main_response.status_code == 200 else {}
                except:
                    cookies = {}
                
                # 2. 주 단위로 데이터 수집 (빠른 처리를 위해 6주로 제한)
                week_count = 0
                max_weeks = 6  # 최대 6주 (약 1.5개월)
                
                while current <= end_dt and week_count < max_weeks:
                    week_end = min(current + timedelta(days=6), end_dt)
                    
                    week_start_str = current.strftime('%Y-%m-%d')
                    week_end_str = week_end.strftime('%Y-%m-%d')
                    
                    try:
                        events = await self._fetch_week_data(
                            client, week_start_str, week_end_str, cookies
                        )
                        if events:
                            all_events.extend(events)
                    except Exception as e:
                        pass  # 한 주 실패해도 계속 진행
                    
                    current = week_end + timedelta(days=1)
                    week_count += 1
                    
                    # API 요청 간격
                    await asyncio.sleep(0.3)
                
                # 중복 제거
                unique_events = self._deduplicate_events(all_events)
                
                if unique_events:
                    print(f"[Investing] SUCCESS: 총 {len(unique_events)}개 이벤트 수집 완료")
                    return unique_events
                
                # 실패 시 HTML 폴백
                return await self._scrape_html_fallback(client, start_date, end_date)
                
        except httpx.TimeoutException:
            print("[Investing] WARNING: 타임아웃")
            return None
        except Exception as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            if "connect" in error_msg.lower():
                print("[Investing] 연결 실패")
            else:
                print(f"[Investing] ERROR: {error_msg}")
            return None
    
    async def _fetch_week_data(
        self,
        client: httpx.AsyncClient,
        start_date: str,
        end_date: str,
        cookies: dict
    ) -> Optional[List[Dict]]:
        """한 주 데이터 가져오기"""
        ajax_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': self.base_url,
            'Referer': f"{self.base_url}/economic-calendar/",
        }
        
        post_data = {
            'country[]': [5, 11, 35, 37, 17, 4, 72, 22],  # 주요 국가들
            'importance[]': [1, 2, 3],
            'dateFrom': start_date,
            'dateTo': end_date,
            'timeZone': 88,
            'timeFilter': 'timeRemain',
            'currentTab': 'custom',
            'limit_from': 0,
        }
        
        try:
            response = await client.post(
                self.ajax_url,
                headers=ajax_headers,
                data=post_data,
                cookies=cookies
            )
            
            if response.status_code == 200:
                return self._parse_ajax_response(response.text, start_date, end_date)
        except:
            pass
        
        return None
    
    def _deduplicate_events(self, events: List[Dict]) -> List[Dict]:
        """이벤트 중복 제거"""
        seen = set()
        unique = []
        
        for event in events:
            # 날짜 + 이벤트명 + 국가로 고유 키 생성
            key = f"{event.get('date')}_{event.get('event', '')}_{event.get('country', '')}"
            if key not in seen:
                seen.add(key)
                unique.append(event)
        
        return unique
    
    def _parse_ajax_response(self, response_text: str, start_date: str, end_date: str) -> Optional[List[Dict]]:
        """AJAX 응답 파싱"""
        try:
            # JSON 응답 확인
            try:
                data = json.loads(response_text)
                if isinstance(data, dict) and 'data' in data:
                    html_content = data.get('data', '')
                else:
                    html_content = response_text
            except json.JSONDecodeError:
                html_content = response_text
            
            soup = BeautifulSoup(html_content, 'html.parser')
            events = []
            
            # 이벤트 행 찾기
            rows = soup.find_all('tr', {'id': re.compile(r'eventRowId_\d+')})
            if not rows:
                rows = soup.find_all('tr', class_=re.compile(r'js-event-item'))
            if not rows:
                rows = soup.find_all('tr', attrs={'data-event-datetime': True})
            
            current_date = None
            
            for row in rows:
                try:
                    # 날짜 헤더
                    date_header = row.find('td', class_='theDay')
                    if date_header:
                        date_text = date_header.get_text(strip=True)
                        try:
                            current_date = self._parse_date(date_text)
                        except:
                            pass
                        continue
                    
                    event = self._parse_event_row(row, current_date)
                    if event and start_date <= event['date'] <= end_date:
                        events.append(event)
                except:
                    continue
            
            return events if events else None
            
        except Exception as e:
            return None
    
    def _parse_event_row(self, row, fallback_date: Optional[str] = None) -> Optional[Dict]:
        """이벤트 행 파싱"""
        try:
            # 날짜/시간 추출
            event_datetime = row.get('data-event-datetime', '')
            if event_datetime:
                try:
                    dt = datetime.fromisoformat(event_datetime.replace('Z', '+00:00'))
                    date_str = dt.strftime('%Y-%m-%d')
                    time_str = dt.strftime('%H:%M')
                except:
                    date_str = fallback_date or datetime.now().strftime('%Y-%m-%d')
                    time_cell = row.find('td', class_='time')
                    time_str = time_cell.get_text(strip=True) if time_cell else ''
            else:
                date_str = fallback_date or datetime.now().strftime('%Y-%m-%d')
                time_cell = row.find('td', class_='time')
                time_str = time_cell.get_text(strip=True) if time_cell else ''
            
            # 국가 추출
            flag_cell = row.find('td', class_='flagCur')
            country = ''
            if flag_cell:
                flag_span = flag_cell.find('span', class_=re.compile(r'cemark'))
                if flag_span:
                    classes = flag_span.get('class', [])
                    for cls in classes:
                        if cls.startswith('cemark_'):
                            country = cls.replace('cemark_', '').upper()
                            break
                if not country:
                    country = flag_cell.get_text(strip=True)[:2].upper()
            
            # 이벤트 이름
            event_cell = row.find('td', class_='event')
            event_name = ''
            if event_cell:
                event_link = event_cell.find('a')
                event_name = event_link.get_text(strip=True) if event_link else event_cell.get_text(strip=True)
            
            if not event_name:
                return None
            
            # 중요도
            importance = 'Medium'
            bull_icons = row.find_all('i', class_=re.compile(r'grayFullBullishIcon|orangeFullBullishIcon'))
            if bull_icons:
                num_bulls = len([i for i in bull_icons if 'Full' in str(i.get('class', []))])
                if num_bulls >= 3:
                    importance = 'High'
                elif num_bulls >= 2:
                    importance = 'Medium'
                else:
                    importance = 'Low'
            
            # 실제값, 예상값, 이전값
            actual = None
            forecast = None
            previous = None
            
            actual_cell = row.find('td', class_='act')
            if actual_cell:
                actual_text = actual_cell.get_text(strip=True)
                if actual_text and actual_text not in ['-', '', 'N/A', '\xa0']:
                    actual = actual_text
            
            forecast_cell = row.find('td', class_='fore')
            if forecast_cell:
                forecast_text = forecast_cell.get_text(strip=True)
                if forecast_text and forecast_text not in ['-', '', 'N/A', '\xa0']:
                    forecast = forecast_text
            
            previous_cell = row.find('td', class_='prev')
            if previous_cell:
                previous_text = previous_cell.get_text(strip=True)
                if previous_text and previous_text not in ['-', '', 'N/A', '\xa0']:
                    previous = previous_text
            
            # 한글 이벤트 이름 변환
            event_name_kr = self._translate_event_name(event_name, country)
            
            return {
                'event': event_name_kr,
                'country': country,
                'date': date_str,
                'time': time_str,
                'impact': importance,
                'actual': actual,
                'forecast': forecast,
                'previous': previous
            }
            
        except:
            return None
    
    async def _scrape_html_fallback(
        self, 
        client: httpx.AsyncClient, 
        start_date: str, 
        end_date: str,
        html_content: Optional[str] = None
    ) -> Optional[List[Dict]]:
        """HTML 직접 파싱 (폴백)"""
        try:
            if not html_content:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                }
                
                response = await client.get(
                    f"{self.base_url}/economic-calendar/",
                    headers=headers
                )
                
                if response.status_code != 200:
                    return None
                
                html_content = response.text
            
            soup = BeautifulSoup(html_content, 'html.parser')
            events = []
            
            table = soup.find('table', {'id': 'economicCalendarData'})
            if not table:
                table = soup.find('table', class_=re.compile(r'genTbl|calendar'))
            
            if not table:
                return None
            
            rows = table.find_all('tr')
            current_date = None
            
            for row in rows:
                date_header = row.find('td', class_='theDay')
                if date_header:
                    date_text = date_header.get_text(strip=True)
                    current_date = self._parse_date(date_text)
                    continue
                
                event = self._parse_event_row(row, current_date)
                if event and start_date <= event['date'] <= end_date:
                    events.append(event)
            
            return events if events else None
            
        except:
            return None
    
    def _parse_date(self, date_text: str) -> str:
        """날짜 텍스트 파싱"""
        try:
            formats = [
                '%Y-%m-%d', '%b %d, %Y', '%B %d, %Y',
                '%d %b %Y', '%d %B %Y', '%m/%d/%Y',
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(date_text.strip(), fmt)
                    return dt.strftime('%Y-%m-%d')
                except:
                    continue
            
            today = datetime.now()
            if 'today' in date_text.lower():
                return today.strftime('%Y-%m-%d')
            elif 'tomorrow' in date_text.lower():
                return (today + timedelta(days=1)).strftime('%Y-%m-%d')
            elif 'yesterday' in date_text.lower():
                return (today - timedelta(days=1)).strftime('%Y-%m-%d')
            
            return today.strftime('%Y-%m-%d')
        except:
            return datetime.now().strftime('%Y-%m-%d')
    
    def _translate_event_name(self, event_name: str, country: str) -> str:
        """이벤트 이름 한글 변환"""
        translations = {
            'CPI': '미국 CPI 발표' if country == 'US' else f'{self._get_country_name(country)} CPI',
            'Consumer Price Index': '미국 CPI 발표' if country == 'US' else f'{self._get_country_name(country)} CPI',
            'Core CPI': '미국 근원 CPI' if country == 'US' else f'{self._get_country_name(country)} 근원 CPI',
            'Unemployment Rate': '미국 실업률' if country == 'US' else f'{self._get_country_name(country)} 실업률',
            'Nonfarm Payrolls': '미국 비농업고용',
            'Non-Farm Payrolls': '미국 비농업고용',
            'FOMC': 'FOMC 기준금리 발표',
            'Fed Interest Rate Decision': 'FOMC 기준금리 발표',
            'Federal Funds Rate': 'FOMC 기준금리 발표',
            'GDP': f'{self._get_country_name(country)} GDP 발표',
            'Gross Domestic Product': f'{self._get_country_name(country)} GDP 발표',
            'PPI': '미국 PPI 발표' if country == 'US' else f'{self._get_country_name(country)} PPI',
            'Producer Price Index': '미국 PPI 발표' if country == 'US' else f'{self._get_country_name(country)} PPI',
            'Retail Sales': '미국 소매판매' if country == 'US' else f'{self._get_country_name(country)} 소매판매',
            'ISM Manufacturing PMI': '미국 ISM 제조업지수',
            'ISM Non-Manufacturing PMI': '미국 ISM 비제조업지수',
            'Durable Goods Orders': '미국 내구재수주',
            'Housing Starts': '미국 신규주택착공',
            'Building Permits': '미국 건축허가',
            'Consumer Confidence': '미국 소비자신뢰지수',
            'Michigan Consumer Sentiment': '미시간 소비자심리지수',
            'ECB Interest Rate Decision': 'ECB 금리결정',
            'ECB Monetary Policy Statement': 'ECB 통화정책 발표',
            'BoK Interest Rate Decision': '한국 기준금리',
            'Korea Interest Rate': '한국 기준금리',
            'BoJ Interest Rate Decision': '일본 BOJ 금리결정',
            'BOJ Policy Rate': '일본 BOJ 금리결정',
            'China GDP': '중국 GDP',
            'China CPI': '중국 CPI',
        }
        
        for eng, kor in translations.items():
            if eng.lower() in event_name.lower():
                return kor
        
        # 키워드 변환
        country_name = self._get_country_name(country)
        
        if 'CPI' in event_name:
            return f'{country_name} CPI'
        elif 'GDP' in event_name:
            return f'{country_name} GDP 발표'
        elif 'Interest Rate' in event_name or 'Rate Decision' in event_name:
            return f'{country_name} 기준금리'
        elif 'Unemployment' in event_name:
            return f'{country_name} 실업률'
        elif 'PMI' in event_name:
            if 'Manufacturing' in event_name:
                return f'{country_name} 제조업 PMI'
            return f'{country_name} PMI'
        
        return event_name
    
    def _get_country_name(self, country: str) -> str:
        """국가 코드를 한글 이름으로"""
        country_names = {
            'US': '미국', 'KR': '한국', 'JP': '일본', 'CN': '중국',
            'DE': '독일', 'GB': '영국', 'EU': '유로존', 'FR': '프랑스',
        }
        return country_names.get(country, country)
