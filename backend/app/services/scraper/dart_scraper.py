"""
DART (전자공시시스템) 스크래퍼
- API 키 있을 때: DART OpenAPI 사용
- API 키 없을 때: DART 웹사이트 직접 파싱
"""
import os
import re
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import httpx
from bs4 import BeautifulSoup

DART_API_KEY = os.getenv("DART_API_KEY", "")
DART_BASE_URL = "https://opendart.fss.or.kr/api"
DART_WEB_URL = "https://dart.fss.or.kr"

# 공시 유형 분류 (호재/악재 판단용)
DISCLOSURE_SENTIMENT = {
    # 호재 신호
    "자기주식취득": "positive",
    "주식배당": "positive",
    "현금배당": "positive",
    "유상증자": "neutral",
    "무상증자": "positive",
    "합병": "neutral",
    "영업실적": "neutral",
    "매출액또는손익구조": "neutral",
    "특허": "positive",
    "수주": "positive",
    "MOU": "positive",
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
    def __init__(self):
        self.api_key = DART_API_KEY

    async def search_corp_code(self, company_name: str) -> Optional[str]:
        """회사명으로 DART corp_code 조회"""
        if not self.api_key:
            return None
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{DART_BASE_URL}/company.json",
                    params={"crtfc_key": self.api_key, "corp_name": company_name}
                )
                data = resp.json()
                if data.get("status") == "000" and data.get("corp_code"):
                    return data["corp_code"]
        except Exception as e:
            print(f"[DART] corp_code 조회 실패: {e}")
        return None

    async def get_disclosures_api(self, corp_code: str, limit: int = 5) -> List[Dict]:
        """DART API로 공시 목록 조회"""
        if not self.api_key:
            return []
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
                        "last_reprt_at": "Y",
                        "page_count": limit,
                    }
                )
                data = resp.json()
                if data.get("status") == "000" and data.get("list"):
                    return [
                        {
                            "date": item.get("rcept_dt", ""),
                            "title": item.get("report_nm", ""),
                            "company": item.get("corp_name", ""),
                            "url": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={item.get('rcept_no', '')}",
                            "type": self._classify_type(item.get("report_nm", "")),
                        }
                        for item in data["list"][:limit]
                    ]
        except Exception as e:
            print(f"[DART] API 조회 실패: {e}")
        return []

    async def get_disclosures_web(self, company_name: str, stock_code: str, limit: int = 5) -> List[Dict]:
        """DART 웹사이트 파싱 (API 키 없을 때 폴백)"""
        try:
            # 종목 코드로 직접 검색
            search_url = f"{DART_WEB_URL}/dsab001/main.do"
            params = {
                "selectKey": stock_code,
                "textCrpCik": "",
                "textCrpNm": company_name,
                "startDt": (datetime.now() - timedelta(days=90)).strftime("%Y%m%d"),
                "endDt": datetime.now().strftime("%Y%m%d"),
                "maxResults": limit,
                "currentPage": 1,
                "corp_cls": "Y",  # 유가증권 (KOSPI)
            }
            async with httpx.AsyncClient(timeout=15, follow_redirects=True,
                                          headers={"User-Agent": "Mozilla/5.0 (compatible)"}) as client:
                resp = await client.get(
                    f"{DART_WEB_URL}/api/search.json",
                    params={
                        "selectKey": "all",
                        "textCrpNm": company_name,
                        "startDt": (datetime.now() - timedelta(days=90)).strftime("%Y%m%d"),
                        "endDt": datetime.now().strftime("%Y%m%d"),
                        "maxResults": limit,
                        "currentPage": 1,
                    }
                )
                data = resp.json()
                items = data.get("result", {}).get("list", [])
                return [
                    {
                        "date": item.get("rceptDt", "")[:10].replace(".", "-"),
                        "title": item.get("rptNm", ""),
                        "company": item.get("crpNm", ""),
                        "url": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={item.get('rceptNo', '')}",
                        "type": self._classify_type(item.get("rptNm", "")),
                    }
                    for item in items[:limit]
                    if item.get("crpNm", "").strip() == company_name.strip() or not company_name
                ]
        except Exception as e:
            print(f"[DART] 웹 파싱 실패: {e}")
        return []

    def _classify_type(self, title: str) -> str:
        """공시 제목에서 유형 분류"""
        for keyword, sentiment in DISCLOSURE_SENTIMENT.items():
            if keyword in title:
                return sentiment
        if any(k in title for k in ["정기공시", "사업보고서", "반기보고서", "분기보고서"]):
            return "neutral"
        return "neutral"

    async def get_recent_disclosures(self, symbol: str, company_name: str, limit: int = 5) -> List[Dict]:
        """심볼/회사명으로 공시 조회 (API → 웹 폴백)"""
        # 1. API 키가 있으면 API 우선
        if self.api_key:
            corp_code = await self.search_corp_code(company_name)
            if corp_code:
                disclosures = await self.get_disclosures_api(corp_code, limit)
                if disclosures:
                    return disclosures

        # 2. 웹 파싱 폴백
        stock_code = symbol.replace(".KS", "").replace(".KQ", "")
        disclosures = await self.get_disclosures_web(company_name, stock_code, limit)
        return disclosures
