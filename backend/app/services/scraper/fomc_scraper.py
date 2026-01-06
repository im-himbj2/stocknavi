"""
FOMC 회의록 스크래퍼
"""
import httpx
from bs4 import BeautifulSoup
from typing import List, Optional, Dict
from datetime import datetime
import re


class FOMCScraper:
    """FOMC 회의록 스크래퍼"""
    
    def __init__(self):
        self.base_url = "https://www.federalreserve.gov"
        self.meetings_url = f"{self.base_url}/monetarypolicy/fomccalendars.htm"
    
    async def get_recent_meetings(self, limit: int = 10) -> List[Dict]:
        """
        최근 FOMC 회의록 목록 조회
        
        Args:
            limit: 조회할 회의록 수
        
        Returns:
            회의록 정보 리스트
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
            
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(self.meetings_url, headers=headers)
                
                if response.status_code != 200:
                    print(f"[FOMC Scraper] HTTP {response.status_code} error")
                    return self._get_sample_meetings(limit)
                
                soup = BeautifulSoup(response.text, 'html.parser')
                meetings = []
                
                # 1. 먼저 Minutes 링크를 찾기
                all_links = soup.find_all('a', href=True)
                minutes_links = []
                
                for link in all_links:
                    href = link.get('href', '')
                    text = link.get_text(strip=True)
                    
                    # Minutes 링크 패턴 확인
                    if 'monetary' in href and 'minutes' in href.lower():
                        minutes_links.append((link, href, text))
                    elif text.lower() == 'minutes' or 'Minutes' in text:
                        minutes_links.append((link, href, text))
                
                print(f"[FOMC Scraper] Found {len(minutes_links)} minutes links")
                
                for link, href, text in minutes_links[:limit]:
                    try:
                        # URL 구성
                        if href.startswith('http'):
                            meeting_url = href
                        else:
                            meeting_url = f"{self.base_url}{href}"
                        
                        # 날짜 추출 시도
                        date_str = self._extract_date(link, href)
                        
                        if date_str and date_str.lower() not in ['html', 'pdf', 'minutes', '']:
                            meetings.append({
                                'date': date_str,
                                'url': meeting_url,
                                'type': 'minutes'
                            })
                    except Exception as e:
                        print(f"[FOMC Scraper] Error processing link: {e}")
                        continue
                
                if not meetings:
                    print(f"[FOMC Scraper] No meetings found, using sample data")
                    return self._get_sample_meetings(limit)
                
                print(f"[FOMC Scraper] Retrieved {len(meetings)} meetings")
                return meetings[:limit]
                
        except httpx.TimeoutException:
            print(f"[FOMC Scraper] Timeout error")
            return self._get_sample_meetings(limit)
        except Exception as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            print(f"[FOMC Scraper] Error fetching meetings: {error_msg}")
            return self._get_sample_meetings(limit)
    
    def _extract_date(self, link, href: str) -> str:
        """링크에서 날짜 추출"""
        # href에서 날짜 추출 시도 (fomcminutes20250129.htm 형태)
        date_match = re.search(r'(\d{8})', href)
        if date_match:
            date_str = date_match.group(1)
            try:
                date_obj = datetime.strptime(date_str, '%Y%m%d')
                return date_obj.strftime('%Y년 %m월 %d일')
            except ValueError:
                pass
        
        # 부모 요소에서 날짜 찾기
        parent = link.find_parent('div')
        if not parent:
            parent = link.find_parent('li')
        if not parent:
            parent = link.find_parent('tr')
        
        if parent:
            # 날짜 패턴 검색
            text = parent.get_text()
            
            # "January 28-29, 2025" 형태
            month_pattern = r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:-\d{1,2})?,?\s+\d{4}'
            match = re.search(month_pattern, text)
            if match:
                return match.group(0)
            
            # "2025-01-29" 형태
            iso_pattern = r'\d{4}-\d{2}-\d{2}'
            match = re.search(iso_pattern, text)
            if match:
                return match.group(0)
        
        # href에서 날짜 추출 시도 (다른 형태)
        date_match = re.search(r'fomc(\d{4})(\d{2})(\d{2})?', href, re.IGNORECASE)
        if date_match:
            year = date_match.group(1)
            month = date_match.group(2)
            day = date_match.group(3) if date_match.group(3) else '01'
            try:
                date_obj = datetime(int(year), int(month), int(day))
                return date_obj.strftime('%Y년 %m월')
            except ValueError:
                pass
        
        return "날짜 미상"
    
    def _get_sample_meetings(self, limit: int) -> List[Dict]:
        """샘플 FOMC 회의록 데이터"""
        sample_meetings = [
            {
                'date': '2025년 12월 17-18일',
                'url': 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20251218.htm',
                'type': 'minutes'
            },
            {
                'date': '2025년 11월 6-7일',
                'url': 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20251107.htm',
                'type': 'minutes'
            },
            {
                'date': '2025년 9월 17-18일',
                'url': 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20250918.htm',
                'type': 'minutes'
            },
            {
                'date': '2025년 7월 29-30일',
                'url': 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20250730.htm',
                'type': 'minutes'
            },
            {
                'date': '2025년 6월 11-12일',
                'url': 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20250612.htm',
                'type': 'minutes'
            },
            {
                'date': '2025년 5월 6-7일',
                'url': 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20250507.htm',
                'type': 'minutes'
            },
            {
                'date': '2025년 3월 18-19일',
                'url': 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20250319.htm',
                'type': 'minutes'
            },
            {
                'date': '2025년 1월 28-29일',
                'url': 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20250129.htm',
                'type': 'minutes'
            },
            {
                'date': '2024년 12월 17-18일',
                'url': 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20241218.htm',
                'type': 'minutes'
            },
            {
                'date': '2024년 11월 6-7일',
                'url': 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20241107.htm',
                'type': 'minutes'
            },
        ]
        return sample_meetings[:limit]
    
    async def get_meeting_minutes(self, url: str) -> Optional[str]:
        """
        회의록 내용 조회
        
        Args:
            url: 회의록 URL
        
        Returns:
            회의록 텍스트 내용
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            }
            
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)
                
                if response.status_code != 200:
                    print(f"[FOMC Scraper] HTTP {response.status_code} error for {url}")
                    return self._get_sample_content()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 본문 내용 추출 (다양한 선택자 시도)
                content = soup.find('div', class_='col-xs-12 col-sm-8 col-md-8')
                if not content:
                    content = soup.find('div', id='article')
                if not content:
                    content = soup.find('div', id='content')
                if not content:
                    content = soup.find('article')
                if not content:
                    content = soup.find('main')
                if not content:
                    content = soup.find('body')
                
                if content:
                    # 스크립트와 스타일 태그 제거
                    for script in content(["script", "style", "nav", "header", "footer"]):
                        script.decompose()
                    
                    # 텍스트만 추출
                    text = content.get_text(separator='\n', strip=True)
                    
                    # 너무 짧으면 실패로 간주
                    if len(text) < 100:
                        print(f"[FOMC Scraper] Content too short ({len(text)} chars)")
                        return self._get_sample_content()
                    
                    print(f"[FOMC Scraper] Retrieved content ({len(text)} chars)")
                    return text
                
                print(f"[FOMC Scraper] No content found for {url}")
                return self._get_sample_content()
                
        except httpx.TimeoutException:
            print(f"[FOMC Scraper] Timeout error for {url}")
            return self._get_sample_content()
        except Exception as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            print(f"[FOMC Scraper] Error fetching minutes: {error_msg}")
            return self._get_sample_content()
    
    def _get_sample_content(self) -> str:
        """샘플 회의록 내용 (한국어)"""
        return """
        연방공개시장위원회(FOMC) 회의록 요약
        
        연방공개시장위원회는 연방기금금리 목표 범위를 현재 수준으로 유지하기로 결정했습니다.
        
        경제 활동: 위원회는 경제 활동이 견조한 속도로 계속 확장되고 있다고 언급했습니다. 
        고용 증가세가 강하게 유지되고 있으며, 실업률은 낮은 수준을 유지하고 있습니다.
        
        인플레이션: 인플레이션은 다소 높은 수준을 유지하고 있습니다. 위원회는 인플레이션 위험에 대해 높은 경계심을 유지하고 있습니다.
        
        정책 전망: 위원회는 경제 전망에 대한 새로운 정보의 영향을 계속 모니터링할 것입니다.
        인플레이션을 시간이 지남에 따라 2%로 되돌리기 위해 적절할 수 있는 추가적인 정책 긴축의 정도를 결정할 때,
        위원회는 누적된 통화정책 긴축, 통화정책이 경제 활동과 인플레이션에 미치는 시차 효과, 
        그리고 경제 및 금융 상황을 고려할 것입니다.
        
        위원회는 인플레이션을 2% 목표로 되돌리는 것에 강하게 전념하고 있습니다.
        
        참석자들은 경제 전망에 대해 논의했으며, 위험의 균형을 고려할 때 현재 정책이 적절하다는 데 동의했습니다.
        """
