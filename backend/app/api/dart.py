"""DART 공시 API — 한국 종목 공시 조회 + AI 호재/악재 요약"""
import os
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.scraper.dart_scraper import DARTScraper

router = APIRouter(prefix="/dart", tags=["dart"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


class DisclosureItem(BaseModel):
    date: str
    title: str
    company: str
    url: str
    type: str           # positive / negative / neutral
    summary: Optional[str] = None
    impact: Optional[str] = None   # 호재 / 악재 / 중립


class DARTResponse(BaseModel):
    symbol: str
    company_name: str
    disclosures: List[DisclosureItem]
    has_api_key: bool


def _classify_impact_ko(disclosure_type: str, title: str) -> str:
    """공시 유형 → 한국어 호재/악재/중립"""
    if disclosure_type == "positive":
        return "호재"
    if disclosure_type == "negative":
        return "악재"
    return "중립"


async def _ai_summarize_disclosures(disclosures: list) -> list:
    """Groq AI로 공시 목록 호재/악재 판단 + 한국어 요약"""
    if not GROQ_API_KEY or not disclosures:
        return disclosures

    import httpx
    titles_text = "\n".join([f"{i+1}. [{d['date']}] {d['title']}" for i, d in enumerate(disclosures)])

    prompt = f"""당신은 한국 주식 전문 애널리스트입니다.
아래 DART 공시 목록을 분석하여 각각에 대해:
1. 호재/악재/중립 판단
2. 한 줄 투자 영향 요약 (30자 이내)

공시 목록:
{titles_text}

JSON 배열로만 응답하세요. 예시:
[
  {{"index": 1, "impact": "호재", "summary": "자사주 매입으로 주가 지지 기대"}},
  {{"index": 2, "impact": "악재", "summary": "대규모 소송으로 비용 부담 우려"}}
]"""

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 512,
                    "temperature": 0.3,
                }
            )
            content = resp.json()["choices"][0]["message"]["content"].strip()
            # JSON 파싱
            import json, re
            m = re.search(r'\[.*\]', content, re.DOTALL)
            if m:
                ai_results = json.loads(m.group())
                for ar in ai_results:
                    idx = ar.get("index", 0) - 1
                    if 0 <= idx < len(disclosures):
                        disclosures[idx]["impact"] = ar.get("impact", "중립")
                        disclosures[idx]["summary"] = ar.get("summary", "")
    except Exception as e:
        print(f"[DART AI] 요약 실패: {e}")

    # AI 실패한 항목은 rule-based fallback
    for d in disclosures:
        if not d.get("impact"):
            d["impact"] = _classify_impact_ko(d.get("type", "neutral"), d.get("title", ""))
        if not d.get("summary"):
            d["summary"] = ""

    return disclosures


@router.get("/{symbol}", response_model=DARTResponse)
async def get_dart_disclosures(
    symbol: str,
    company_name: str = Query("", description="회사명 (yfinance에서 가져온 이름)"),
    limit: int = Query(5, ge=1, le=20),
):
    """한국 종목의 최근 DART 공시 조회 + AI 호재/악재 판단"""
    # 한국 종목인지 확인
    clean = symbol.replace(".KS", "").replace(".KQ", "")
    if not (clean.isdigit() or symbol.endswith(".KS") or symbol.endswith(".KQ")):
        raise HTTPException(status_code=400, detail="한국 종목(.KS/.KQ)만 지원합니다")

    # 회사명이 없으면 심볼에서 추출 시도
    if not company_name:
        try:
            import yfinance as yf
            info = yf.Ticker(symbol).info
            company_name = info.get("longName") or info.get("shortName") or clean
            # 괄호 제거 (예: "Samsung Electronics Co., Ltd." → "삼성전자")
            company_name = company_name.split("(")[0].strip()
        except Exception:
            company_name = clean

    scraper = DARTScraper()
    disclosures = await scraper.get_recent_disclosures(symbol, company_name, limit)

    # AI 호재/악재 분류
    disclosures = await _ai_summarize_disclosures(disclosures)

    return DARTResponse(
        symbol=symbol,
        company_name=company_name,
        disclosures=[DisclosureItem(**d) for d in disclosures],
        has_api_key=bool(os.getenv("DART_API_KEY")),
    )
