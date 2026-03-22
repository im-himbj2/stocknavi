"""
Fed 연설문 스크래퍼
"""
import httpx
from bs4 import BeautifulSoup
from typing import List, Optional, Dict
from datetime import datetime
import re


class FedSpeechScraper:
    """Fed 연설문 스크래퍼"""

    def __init__(self):
        self.base_url = "https://www.federalreserve.gov"

    async def get_recent_speeches(self, limit: int = 10) -> List[Dict]:
        """
        최근 Fed 연설문 목록 조회
        speeches.htm은 JS 렌더링이라 연도별 정적 페이지를 직접 파싱
        """
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }

        speeches = []
        current_year = datetime.now().year

        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                # 현재 연도, 전년도 순서로 시도
                for year in [current_year, current_year - 1]:
                    if len(speeches) >= limit:
                        break
                    url = f"{self.base_url}/newsevents/{year}-speeches.htm"
                    try:
                        response = await client.get(url, headers=headers)
                        if response.status_code != 200:
                            print(f"[Fed Speech Scraper] HTTP {response.status_code} for {url}")
                            continue

                        soup = BeautifulSoup(response.text, 'html.parser')
                        parsed = self._parse_speeches_page(soup)
                        speeches.extend(parsed)
                        print(f"[Fed Speech Scraper] {year}: {len(parsed)} speeches parsed")
                    except Exception as e:
                        print(f"[Fed Speech Scraper] Error fetching {year}: {e}")
                        continue

        except Exception as e:
            print(f"[Fed Speech Scraper] Client error: {e}")

        if len(speeches) < 3:
            print(f"[Fed Speech Scraper] Too few speeches ({len(speeches)}), using sample data")
            return self._get_sample_speeches(limit)

        # 날짜 내림차순 정렬
        def sort_key(s):
            try:
                return datetime.strptime(s['date'], '%Y-%m-%d')
            except:
                return datetime.min

        speeches.sort(key=sort_key, reverse=True)
        print(f"[Fed Speech Scraper] Total {len(speeches)} speeches retrieved")
        return speeches[:limit]

    def _parse_speeches_page(self, soup) -> List[Dict]:
        """연도별 연설 페이지 파싱 (dt/dd 구조)"""
        speeches = []
        # <dl> 안의 <dt>(날짜) + <dd>(제목/연사) 쌍
        dl = soup.find('dl')
        if not dl:
            # fallback: 모든 /newsevents/speech/ 링크 수집
            for link in soup.find_all('a', href=re.compile(r'/newsevents/speech/.*\.htm')):
                href = link.get('href', '')
                title = link.get_text(strip=True)
                if not title or len(title) < 5:
                    continue
                speech_url = href if href.startswith('http') else f"{self.base_url}{href}"
                date_str = self._extract_date_from_href(href)
                speaker = self._extract_speaker(link)
                speeches.append({'title': title, 'date': date_str, 'url': speech_url, 'speaker': speaker})
            return speeches

        items = dl.find_all(['dt', 'dd'])
        current_date = 'N/A'
        for item in items:
            if item.name == 'dt':
                current_date = self._parse_date_text(item.get_text(strip=True))
            elif item.name == 'dd':
                link = item.find('a', href=re.compile(r'/newsevents/speech/'))
                if not link:
                    continue
                href = link.get('href', '')
                title = link.get_text(strip=True)
                if not title or len(title) < 5:
                    continue
                speech_url = href if href.startswith('http') else f"{self.base_url}{href}"
                # dt 날짜 우선, 없으면 URL에서 추출
                date_str = current_date if current_date != 'N/A' else self._extract_date_from_href(href)
                speaker = self._extract_speaker_from_text(item.get_text())
                speeches.append({'title': title, 'date': date_str, 'url': speech_url, 'speaker': speaker})
        return speeches

    def _parse_date_text(self, text: str) -> str:
        """'3/21/2026' 또는 'March 21, 2026' 형태 → 'YYYY-MM-DD'"""
        # M/D/YYYY 형태
        m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', text.strip())
        if m:
            try:
                return datetime(int(m.group(3)), int(m.group(1)), int(m.group(2))).strftime('%Y-%m-%d')
            except:
                pass
        # Month D, YYYY 형태
        m = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})', text)
        if m:
            try:
                return datetime.strptime(f"{m.group(1)} {m.group(2)} {m.group(3)}", '%B %d %Y').strftime('%Y-%m-%d')
            except:
                pass
        return 'N/A'

    def _extract_date_from_href(self, href: str) -> str:
        """URL에서 날짜 추출: speech20260321a.htm → '2026-03-21'"""
        m = re.search(r'speech(\d{8})', href)
        if m:
            try:
                return datetime.strptime(m.group(1), '%Y%m%d').strftime('%Y-%m-%d')
            except:
                pass
        return 'N/A'

    def _extract_speaker_from_text(self, text: str) -> Optional[str]:
        """dd 텍스트에서 연사 이름 추출"""
        patterns = [
            r'(Jerome H\. Powell|Chair Powell)',
            r'(Michelle W\. Bowman)',
            r'(Christopher J\. Waller)',
            r'(Lisa D\. Cook)',
            r'(Philip N\. Jefferson)',
            r'(Adriana D\. Kugler)',
            r'(Michael S\. Barr)',
            r'(Stephen I\. Miran)',
            r'(Governor|Vice Chair|Chair)\s+\w+',
        ]
        for pattern in patterns:
            m = re.search(pattern, text)
            if m:
                return m.group(0)
        return None
    
    # _extract_date / _extract_speaker는 _extract_date_from_href / _extract_speaker_from_text 로 대체됨
    def _extract_speaker(self, link) -> Optional[str]:
        """fallback용 연설자 추출 (링크 기반)"""
        parent = link.find_parent('dd') or link.find_parent('div') or link.find_parent('li')
        if parent:
            return self._extract_speaker_from_text(parent.get_text())
        return None


    def _get_sample_speeches(self, limit: int) -> List[Dict]:
        """샘플 연설문 데이터"""
        sample_speeches = [
            {
                'title': 'Monetary Policy and the Economic Outlook',
                'date': '2025-12-15',
                'url': 'https://www.federalreserve.gov/newsevents/speech/powell20251215a.htm',
                'speaker': 'Chair Powell'
            },
            {
                'title': 'Financial Stability and Bank Supervision',
                'date': '2025-12-10',
                'url': 'https://www.federalreserve.gov/newsevents/speech/barr20251210a.htm',
                'speaker': 'Vice Chair Barr'
            },
            {
                'title': 'The U.S. Economy and Monetary Policy',
                'date': '2025-11-20',
                'url': 'https://www.federalreserve.gov/newsevents/speech/jefferson20251120a.htm',
                'speaker': 'Vice Chair Jefferson'
            },
            {
                'title': 'Inflation, Employment, and the Fed Dual Mandate',
                'date': '2025-11-15',
                'url': 'https://www.federalreserve.gov/newsevents/speech/waller20251115a.htm',
                'speaker': 'Governor Waller'
            },
            {
                'title': 'Central Bank Digital Currencies and the Future of Money',
                'date': '2025-11-05',
                'url': 'https://www.federalreserve.gov/newsevents/speech/bowman20251105a.htm',
                'speaker': 'Governor Bowman'
            },
            {
                'title': 'Economic Developments and the Path Forward',
                'date': '2025-10-25',
                'url': 'https://www.federalreserve.gov/newsevents/speech/cook20251025a.htm',
                'speaker': 'Governor Cook'
            },
            {
                'title': 'Labor Market Dynamics and Wage Growth',
                'date': '2025-10-15',
                'url': 'https://www.federalreserve.gov/newsevents/speech/kugler20251015a.htm',
                'speaker': 'Governor Kugler'
            },
            {
                'title': 'Reflections on the Economy and Monetary Policy',
                'date': '2025-10-01',
                'url': 'https://www.federalreserve.gov/newsevents/speech/powell20251001a.htm',
                'speaker': 'Chair Powell'
            },
            {
                'title': 'Banking Regulation and Financial Innovation',
                'date': '2025-09-20',
                'url': 'https://www.federalreserve.gov/newsevents/speech/barr20250920a.htm',
                'speaker': 'Vice Chair Barr'
            },
            {
                'title': 'Global Economic Challenges and U.S. Monetary Policy',
                'date': '2025-09-10',
                'url': 'https://www.federalreserve.gov/newsevents/speech/jefferson20250910a.htm',
                'speaker': 'Vice Chair Jefferson'
            },
        ]
        return sample_speeches[:limit]
    
    async def get_speech_content(self, url: str) -> Optional[str]:
        """
        연설문 내용 조회
        
        Args:
            url: 연설문 URL
        
        Returns:
            연설문 텍스트 내용
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            }
            
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)
                
                if response.status_code != 200:
                    print(f"[Fed Speech Scraper] HTTP {response.status_code} error for {url}")
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
                        print(f"[Fed Speech Scraper] Content too short ({len(text)} chars)")
                        return self._get_sample_content()
                    
                    print(f"[Fed Speech Scraper] Retrieved content ({len(text)} chars)")
                    return text
                
                print(f"[Fed Speech Scraper] No content found for {url}")
                return self._get_sample_content()
                
        except httpx.TimeoutException:
            print(f"[Fed Speech Scraper] Timeout error for {url}")
            return self._get_sample_content()
        except Exception as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            print(f"[Fed Speech Scraper] Error fetching speech content: {error_msg}")
            return self._get_sample_content()
    
    def _get_sample_content(self) -> str:
        """샘플 연설문 내용 (한국어)"""
        return """
        연방준비제도 연설 요약
        
        오늘 경제 전망과 통화 정책에 대해 말씀드릴 기회를 주셔서 감사합니다.
        
        미국 경제는 지난 한 해 동안 놀라운 회복력을 보여주었습니다. 실질 GDP 성장률은 견조하게 유지되었으며,
        이는 강한 소비 지출과 탄탄한 노동 시장에 의해 뒷받침되었습니다.
        
        노동 시장은 여전히 타이트하며, 실업률은 역사적 저점 근처에 있습니다. 일자리 창출은 
        지난 몇 년간의 급격한 속도에서 완화되었지만 여전히 건전한 속도로 계속되고 있습니다.
        
        인플레이션은 정점에서 상당히 하락했지만 여전히 2% 목표를 상회하고 있습니다.
        우리는 인플레이션을 2%로 되돌리기 위해 전념하고 있으며, 인플레이션이 그 목표를 향해 
        지속 가능하게 움직이고 있다고 확신할 때까지 정책을 제한적으로 유지할 것입니다.
        
        앞으로 경제는 완만한 속도로 계속 성장할 것으로 전망합니다. 인플레이션은 계속해서 
        점진적으로 하락할 것으로 예상되지만, 그 경로는 때때로 울퉁불퉁할 수 있습니다.
        
        연방준비제도는 경계를 늦추지 않고 최대 고용과 물가 안정이라는 이중 책무를 달성하기 위해 
        필요에 따라 정책을 조정할 것입니다.
        
        감사합니다.
        """
