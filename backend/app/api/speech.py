"""
연설 요약 API - FOMC 회의록 및 연설문 요약
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
from app.services.scraper.fomc_scraper import FOMCScraper
from app.services.scraper.fed_speech_scraper import FedSpeechScraper
from app.services.ai.summarizer import AISummarizer

router = APIRouter()

# 전역 인스턴스
fomc_scraper = FOMCScraper()
fed_speech_scraper = FedSpeechScraper()
ai_summarizer = AISummarizer()

# 간단한 메모리 캐시
_cache = {}
_cache_ttl = {}
CACHE_DURATION = 3600 * 24  # 24시간 캐시


def get_cached(key: str):
    """캐시에서 데이터 조회"""
    if key in _cache and key in _cache_ttl:
        if datetime.now() < _cache_ttl[key]:
            return _cache[key]
        else:
            del _cache[key]
            del _cache_ttl[key]
    return None


def set_cached(key: str, value: Any):
    """캐시에 데이터 저장"""
    _cache[key] = value
    _cache_ttl[key] = datetime.now() + timedelta(seconds=CACHE_DURATION)


class SpeechItem(BaseModel):
    """연설/회의록 항목"""
    id: str
    title: str
    date: str
    url: str
    type: str  # 'minutes' or 'speech'
    speaker: Optional[str] = None


class SpeechSummaryResponse(BaseModel):
    """연설 요약 응답"""
    id: str
    title: str
    date: str
    url: str
    type: str
    speaker: Optional[str] = None
    summary: str
    keywords: List[str] = []
    sentiment: Optional[str] = None  # positive, negative, neutral
    cached: bool = False
    updated_at: str


class SpeechListResponse(BaseModel):
    """연설 목록 응답"""
    items: List[SpeechItem]
    total: int
    updated_at: str


# ============================================================
# 중요: 구체적인 경로를 먼저 정의해야 {speech_id}에 매칭되지 않음
# ============================================================

@router.get("/speech/fomc", response_model=SpeechListResponse)
async def get_fomc_meetings(
    limit: int = Query(10, description="조회할 회의록 수")
):
    """
    FOMC 회의록 목록 조회
    """
    try:
        cache_key = f"fomc_meetings_{limit}"
        cached_data = get_cached(cache_key)
        if cached_data:
            return SpeechListResponse(**cached_data)
        
        print(f"[Speech API] FOMC 회의록 목록 조회 (limit={limit})")
        meetings = await fomc_scraper.get_recent_meetings(limit)
        
        items = []
        for idx, meeting in enumerate(meetings):
            items.append(SpeechItem(
                id=f"fomc_{idx}",
                title=f"FOMC 회의록 - {meeting['date']}",
                date=meeting['date'],
                url=meeting['url'],
                type=meeting.get('type', 'minutes')
            ))
        
        result = SpeechListResponse(
            items=items,
            total=len(items),
            updated_at=datetime.now().isoformat()
        )
        
        set_cached(cache_key, result.model_dump())
        print(f"[Speech API] FOMC 회의록 {len(items)}개 조회 완료")
        return result
        
    except Exception as e:
        print(f"[Speech API] FOMC 회의록 조회 실패: {e}")
        # 에러 시에도 빈 결과 반환
        return SpeechListResponse(
            items=[],
            total=0,
            updated_at=datetime.now().isoformat()
        )


@router.get("/speech/recent", response_model=SpeechListResponse)
async def get_recent_speeches(
    limit: int = Query(10, description="조회할 연설문 수")
):
    """
    최근 연설문 목록 조회
    """
    try:
        cache_key = f"recent_speeches_{limit}"
        cached_data = get_cached(cache_key)
        if cached_data:
            return SpeechListResponse(**cached_data)
        
        print(f"[Speech API] 최근 연설문 목록 조회 (limit={limit})")
        speeches = await fed_speech_scraper.get_recent_speeches(limit)
        
        items = []
        for idx, speech in enumerate(speeches):
            items.append(SpeechItem(
                id=f"speech_{idx}",
                title=speech.get('title', 'N/A'),
                date=speech.get('date') or 'N/A',
                url=speech.get('url', '#'),
                type='speech',
                speaker=speech.get('speaker')
            ))
        
        result = SpeechListResponse(
            items=items,
            total=len(items),
            updated_at=datetime.now().isoformat()
        )
        
        set_cached(cache_key, result.model_dump())
        print(f"[Speech API] 연설문 {len(items)}개 조회 완료")
        return result
        
    except Exception as e:
        print(f"[Speech API] 연설문 조회 실패: {e}")
        # 에러 시에도 빈 결과 반환
        return SpeechListResponse(
            items=[],
            total=0,
            updated_at=datetime.now().isoformat()
        )


@router.get("/speech/summary/{speech_id}", response_model=SpeechSummaryResponse)
async def get_speech_summary(
    speech_id: str,
    use_openai: bool = Query(False, description="OpenAI 사용 여부")
):
    """
    특정 연설/회의록 요약 조회
    
    - **speech_id**: 연설 ID (예: fomc_0, speech_0)
    - **use_openai**: OpenAI 사용 여부 (기본값: False, Ollama 사용)
    """
    try:
        cache_key = f"speech_summary_{speech_id}_{use_openai}"
        cached_data = get_cached(cache_key)
        if cached_data:
            cached_data['cached'] = True
            return SpeechSummaryResponse(**cached_data)
        
        print(f"[Speech API] 요약 요청: {speech_id}")
        
        # speech_id 파싱
        if speech_id.startswith('fomc_'):
            # FOMC 회의록
            try:
                idx = int(speech_id.split('_')[1])
            except (IndexError, ValueError):
                raise HTTPException(status_code=400, detail="잘못된 FOMC ID 형식입니다")
            
            meetings = await fomc_scraper.get_recent_meetings(idx + 1)
            if idx >= len(meetings):
                raise HTTPException(status_code=404, detail="회의록을 찾을 수 없습니다")
            
            meeting = meetings[idx]
            content = await fomc_scraper.get_meeting_minutes(meeting['url'])
            
            if not content:
                raise HTTPException(status_code=404, detail="회의록 내용을 가져올 수 없습니다")
            
            title = f"FOMC 회의록 - {meeting['date']}"
            date = meeting['date']
            url = meeting['url']
            speech_type = 'minutes'
            speaker = None
            
        elif speech_id.startswith('speech_'):
            # Fed 연설문
            try:
                idx = int(speech_id.split('_')[1])
            except (IndexError, ValueError):
                raise HTTPException(status_code=400, detail="잘못된 연설 ID 형식입니다")
            
            speeches = await fed_speech_scraper.get_recent_speeches(idx + 1)
            if idx >= len(speeches):
                raise HTTPException(status_code=404, detail="연설문을 찾을 수 없습니다")
            
            speech = speeches[idx]
            content = await fed_speech_scraper.get_speech_content(speech['url'])
            
            if not content:
                raise HTTPException(status_code=404, detail="연설문 내용을 가져올 수 없습니다")
            
            title = speech.get('title', 'N/A')
            date = speech.get('date') or 'N/A'
            url = speech.get('url', '#')
            speech_type = 'speech'
            speaker = speech.get('speaker')
        else:
            raise HTTPException(status_code=400, detail="잘못된 speech_id 형식입니다. fomc_ 또는 speech_로 시작해야 합니다.")
        
        # AI 요약 생성
        try:
            print(f"[Speech API] AI 요약 생성 중... (content length: {len(content)})")
            summary = await ai_summarizer.summarize(content, use_openai=use_openai, max_length=500)
            
            if not summary or len(summary.strip()) < 10:
                summary = "요약을 생성할 수 없습니다. AI 서비스가 사용 불가능할 수 있습니다."
        except Exception as e:
            print(f"[Speech API] AI 요약 생성 오류: {e}")
            summary = f"요약 생성 중 오류가 발생했습니다. 원문을 직접 확인해주세요."
        
        # 간단한 키워드 추출 (요약에서)
        keywords = []
        if summary:
            economic_keywords = ['금리', '인플레이션', '경제', '성장', '고용', '시장', '정책', '연준', 'FOMC', 
                               'interest rate', 'inflation', 'economy', 'growth', 'employment', 'market', 'policy', 'Fed']
            for keyword in economic_keywords:
                if keyword.lower() in summary.lower():
                    keywords.append(keyword)
            keywords = list(set(keywords))[:5]  # 중복 제거 및 최대 5개
        
        # 간단한 감정 분석 (키워드 기반)
        sentiment = 'neutral'
        positive_words = ['긍정', '상승', '개선', '증가', '성장', '안정', 'positive', 'growth', 'improvement', 'increase']
        negative_words = ['부정', '하락', '악화', '감소', '위험', '불안', 'negative', 'decline', 'risk', 'concern']
        
        summary_lower = summary.lower()
        positive_count = sum(1 for word in positive_words if word.lower() in summary_lower)
        negative_count = sum(1 for word in negative_words if word.lower() in summary_lower)
        
        if positive_count > negative_count:
            sentiment = 'positive'
        elif negative_count > positive_count:
            sentiment = 'negative'
        
        result = SpeechSummaryResponse(
            id=speech_id,
            title=title,
            date=date,
            url=url,
            type=speech_type,
            speaker=speaker,
            summary=summary,
            keywords=keywords,
            sentiment=sentiment,
            cached=False,
            updated_at=datetime.now().isoformat()
        )
        
        set_cached(cache_key, result.model_dump())
        print(f"[Speech API] 요약 완료: {title}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Speech API] 요약 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=f"연설 요약 생성 실패: {str(e)}")
