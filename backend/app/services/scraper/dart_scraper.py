"""
DART (전자공시시스템) 스크래퍼
- API 키 있을 때: DART OpenAPI 사용 (corpCode.xml → list.json)
- API 키 없을 때: DART 웹사이트 직접 파싱
"""
import os
import io
import asyncio
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import httpx

DART_API_KEY = os.getenv("DART_API_KEY", "")
DART_BASE_URL = "https://opendart.fss.or.kr/api"
DART_WEB_URL = "https://dart.fss.or.kr"

# 공시 유형 분류 (호재/악재 판단용)
DISCLOSURE_SENTIMENT = {
    # 호재 신호
    "자기주식취득": "positive",
    "주식배당": "positive",
    "현금배당": "positive",
    "무상증자": "positive",
    "특허": "positive",
    "수주": "positive",
    "MOU": "positive",
    # 중립
    "유상증자": "neutral",
    "합병": "neutral",
    "영업실적": "neutral",
    "매출액또는손익구조": "neutral",
    "사업보고서": "neutral",
    "반기보고서": "neutral",
    "분기보고서": "neutral",
    # 악재 신호
    "불성실공시": "negative",
    "횡령": "negative",
    "배임": "negative",
    "소송": "negative",
    "과징금": "negative",
    "거래정지": "negative",
    "감사의견": "negative",
    "자본잠식": "negative",
}


def _fmt_date(raw: str) -> str:
    """YYYYMMDD → YYYY-MM-DD 변환 (8자리 미만이면 원본 반환)"""
    s = raw.strip()
    if len(s) >= 8:
        return f"{s[:4]}-{s[4:6]}-{s[6:8]}"
    return s


class DARTScraper:
    # 클래스 수준 캐시 (프로세스 공유, 하루 1회 갱신)
    _corp_code_map: dict = {}    # {stock_code: corp_code}
    _corp_name_map: dict = {}    # {stock_code: corp_name (한국어)}
    _cache_date: str = ""
    _loading_lock: Optional[asyncio.Lock] = None  # race condition 방지

    def __init__(self):
        self.api_key = os.getenv("DART_API_KEY", "")  # 항상 최신 env 값 참조

    @classmethod
    def _get_lock(cls) -> asyncio.Lock:
        """이벤트 루프별 Lock 생성 (프로세스 재사용 안전)"""
        if cls._loading_lock is None:
            cls._loading_lock = asyncio.Lock()
        return cls._loading_lock

    async def _load_corp_codes(self):
        """corpCode.xml ZIP 다운로드 → stock_code→(corp_code, corp_name) 매핑 캐시"""
        if not self.api_key:
            return  # API키 없으면 스킵

        today = datetime.now().strftime("%Y%m%d")
        if DARTScraper._cache_date == today and DARTScraper._corp_code_map:
            return  # 이미 오늘 캐시됨

        async with self._get_lock():
            # Lock 획득 후 재확인 (다른 요청이 먼저 완료했을 수 있음)
            if DARTScraper._cache_date == today and DARTScraper._corp_code_map:
                return
            try:
                print("[DART] corpCode.xml 다운로드 중...")
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.get(
                        f"{DART_BASE_URL}/corpCode.xml",
                        params={"crtfc_key": self.api_key}
                    )
                if resp.status_code != 200 or not resp.content:
                    print(f"[DART] corpCode.xml 응답 오류: {resp.status_code}")
                    return
                zf = zipfile.ZipFile(io.BytesIO(resp.content))
                xml_data = zf.read("CORPCODE.xml").decode("utf-8")
                root = ET.fromstring(xml_data)
                code_map, name_map = {}, {}
                for item in root.findall("list"):
                    sc = item.findtext("stock_code", "").strip()
                    cc = item.findtext("corp_code", "").strip()
                    cn = item.findtext("corp_name", "").strip()
                    if sc:
                        code_map[sc] = cc
                        name_map[sc] = cn
                DARTScraper._corp_code_map = code_map
                DARTScraper._corp_name_map = name_map
                DARTScraper._cache_date = today
                print(f"[DART] corp_code 캐시 완료: {len(code_map)}개 종목")
            except Exception as e:
                print(f"[DART] corpCode.xml 로드 실패: {e}")

    async def get_corp_info_by_stock(self, stock_code: str) -> Tuple[Optional[str], str]:
        """종목코드 → (corp_code, 한국어 회사명) 반환"""
        await self._load_corp_codes()
        corp_code = DARTScraper._corp_code_map.get(stock_code)
        corp_name = DARTScraper._corp_name_map.get(stock_code, "")
        return corp_code, corp_name

    async def get_disclosures_api(self, corp_code: str, limit: int = 5) -> List[Dict]:
        """DART API로 공시 목록 조회 (corp_code 8자리 필요)"""
        today = datetime.now().strftime("%Y%m%d")
        three_months_ago = (datetime.now() - timedelta(days=90)).strftime("%Y%m%d")
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{DART_BASE_URL}/list.json",
                    params={
                        "crtfc_key": self.api_key,
                        "corp_code": corp_code,
                        "bgn_de": three_months_ago,
                        "end_de": today,
                        "page_count": limit,
                    }
                )
            if resp.status_code != 200:
                print(f"[DART] list.json 상태 오류: {resp.status_code}")
                return []
            if not resp.text.strip():
                print("[DART] list.json 빈 응답")
                return []
            data = resp.json()
            if data.get("status") != "000":
                print(f"[DART] list.json 에러: {data.get('message', data.get('status'))}")
                return []
            items = data.get("list", [])
            return [
                {
                    "date": _fmt_date(item.get("rcept_dt", "")),
                    "title": item.get("report_nm", "").strip(),
                    "company": item.get("corp_name", "").strip(),
                    "url": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={item.get('rcept_no', '')}",
                    "type": self._classify_type(item.get("report_nm", "")),
                }
                for item in items[:limit]
            ]
        except Exception as e:
            print(f"[DART] API 조회 실패: {e}")
        return []

    async def get_disclosures_web(self, stock_code: str, limit: int = 5) -> List[Dict]:
        """DART 웹사이트 파싱 폴백 (stock_code 직접 사용)"""
        try:
            async with httpx.AsyncClient(
                timeout=15, follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (compatible; StockNavi/1.0)"}
            ) as client:
                resp = await client.get(
                    f"{DART_WEB_URL}/api/search.json",
                    params={
                        "selectKey": stock_code,
                        "textCrpCik": stock_code,
                        "startDt": (datetime.now() - timedelta(days=90)).strftime("%Y%m%d"),
                        "endDt": datetime.now().strftime("%Y%m%d"),
                        "maxResults": limit,
                        "currentPage": 1,
                    }
                )
            if not resp.text.strip():
                print(f"[DART] 웹 API 빈 응답 (stock_code={stock_code})")
                return []
            data = resp.json()
            items = data.get("result", {}).get("list", [])
            return [
                {
                    "date": _fmt_date(item.get("rceptDt", "")),
                    "title": item.get("rptNm", "").strip(),
                    "company": item.get("crpNm", "").strip(),
                    "url": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={item.get('rceptNo', '')}",
                    "type": self._classify_type(item.get("rptNm", "")),
                }
                for item in items[:limit]
            ]
        except Exception as e:
            print(f"[DART] 웹 파싱 실패: {e}")
        return []

    def _classify_type(self, title: str) -> str:
        """공시 제목에서 호재/악재/중립 분류"""
        for keyword, sentiment in DISCLOSURE_SENTIMENT.items():
            if keyword in title:
                return sentiment
        return "neutral"

    async def get_recent_disclosures(self, symbol: str, limit: int = 5) -> Tuple[List[Dict], str]:
        """
        공시 조회 통합 메서드: API 우선 → 웹 폴백
        Returns: (disclosures, resolved_company_name)
        """
        stock_code = symbol.replace(".KS", "").replace(".KQ", "").strip()

        # 1. API 키가 있고 한국 종목이면 API 우선
        if self.api_key and stock_code.isdigit():
            try:
                corp_code, corp_name = await self.get_corp_info_by_stock(stock_code)
                if corp_code:
                    disclosures = await self.get_disclosures_api(corp_code, limit)
                    if disclosures:
                        return disclosures, corp_name or stock_code
                    print(f"[DART] API 결과 없음, 웹으로 폴백 (corp_code={corp_code})")
                else:
                    print(f"[DART] corp_code 조회 실패 (stock_code={stock_code}), 웹으로 폴백")
                # corp_name을 웹 폴백에서도 활용
                company_name_hint = corp_name or stock_code
            except Exception as e:
                print(f"[DART] API 오류, 웹으로 폴백: {e}")
                company_name_hint = stock_code
        else:
            company_name_hint = stock_code

        # 2. 웹 파싱 폴백
        disclosures = await self.get_disclosures_web(stock_code, limit)
        # 웹 결과에서 회사명 추출 (첫 번째 항목의 company 필드)
        resolved_name = (disclosures[0].get("company") if disclosures else None) or company_name_hint
        return disclosures, resolved_name
