"""
DART (전자공시시스템) 스크래퍼
- API 키 있을 때: DART OpenAPI 사용 (corpCode.xml → list.json)
- API 키 없을 때: DART 웹사이트 직접 파싱
"""
import os
import io
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Dict, Optional
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


class DARTScraper:
    # 클래스 수준 캐시 (프로세스 공유, 하루 1회 갱신)
    _corp_code_map: dict = {}   # {stock_code: corp_code}
    _cache_date: str = ""

    def __init__(self):
        self.api_key = DART_API_KEY

    async def _load_corp_codes(self):
        """corpCode.xml ZIP 다운로드 → stock_code→corp_code 매핑 캐시"""
        today = datetime.now().strftime("%Y%m%d")
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
            mapping = {}
            for item in root.findall("list"):
                sc = item.findtext("stock_code", "").strip()
                cc = item.findtext("corp_code", "").strip()
                if sc:
                    mapping[sc] = cc
            DARTScraper._corp_code_map = mapping
            DARTScraper._cache_date = today
            print(f"[DART] corp_code 캐시 완료: {len(mapping)}개 종목")
        except Exception as e:
            print(f"[DART] corpCode.xml 로드 실패: {e}")

    async def get_corp_code_by_stock(self, stock_code: str) -> Optional[str]:
        """종목코드(6자리) → DART corp_code(8자리) 조회"""
        await self._load_corp_codes()
        return DARTScraper._corp_code_map.get(stock_code)

    async def get_disclosures_api(self, corp_code: str, limit: int = 5) -> List[Dict]:
        """DART API로 공시 목록 조회 (corp_code 필요)"""
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
                    "date": item.get("rcept_dt", "")[:8],
                    "title": item.get("report_nm", ""),
                    "company": item.get("corp_name", ""),
                    "url": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={item.get('rcept_no', '')}",
                    "type": self._classify_type(item.get("report_nm", "")),
                }
                for item in items[:limit]
            ]
        except Exception as e:
            print(f"[DART] API 조회 실패: {e}")
        return []

    async def get_disclosures_web(self, company_name: str, stock_code: str, limit: int = 5) -> List[Dict]:
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
                    "date": item.get("rceptDt", "")[:8],
                    "title": item.get("rptNm", ""),
                    "company": item.get("crpNm", ""),
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

    async def get_recent_disclosures(self, symbol: str, company_name: str, limit: int = 5) -> List[Dict]:
        """공시 조회 통합 메서드: API 우선 → 웹 폴백"""
        stock_code = symbol.replace(".KS", "").replace(".KQ", "").strip()

        # 1. API 키가 있고 종목코드가 숫자(한국 종목)이면 API 우선
        if self.api_key and stock_code.isdigit():
            try:
                corp_code = await self.get_corp_code_by_stock(stock_code)
                if corp_code:
                    disclosures = await self.get_disclosures_api(corp_code, limit)
                    if disclosures:
                        return disclosures
                    print(f"[DART] API 결과 없음, 웹으로 폴백 (corp_code={corp_code})")
                else:
                    print(f"[DART] corp_code 조회 실패 (stock_code={stock_code}), 웹으로 폴백")
            except Exception as e:
                print(f"[DART] API 오류, 웹으로 폴백: {e}")

        # 2. 웹 파싱 폴백
        return await self.get_disclosures_web(company_name, stock_code, limit)
