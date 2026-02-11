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
CACHE_DURATION = 3600 * 6  # 6시간 캐시 (더 자주 업데이트)


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
    # 신규 필드
    hawk_dove_score: float = 50.0  # 0(Dove) ~ 100(Hawk)
    market_impact_score: int = 5    # 1 ~ 10
    speaker_info: Optional[Dict[str, Any]] = None
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
    limit: int = Query(10, description="조회할 회의록 수"),
    force_refresh: bool = Query(False, description="캐시 무시하고 강제 새로고침")
):
    """
    FOMC 회의록 목록 조회
    """
    try:
        cache_key = f"fomc_meetings_{limit}"
        if not force_refresh:
            cached_data = get_cached(cache_key)
            if cached_data:
                return SpeechListResponse(**cached_data)
        
        print(f"[Speech API] FOMC 회의록 목록 조회 (limit={limit})")
        meetings = await fomc_scraper.get_recent_meetings(limit)
        
        # 날짜 순 정렬 시도 (이미 정렬되어 있을 수 있으나 확약)
        try:
            # "2025년 01월 29일" 또는 "January 28-29, 2025" 형태 대응
            def parse_fomc_date(date_str):
                try:
                    # 한국어 형태 우선 시도
                    if '년' in date_str:
                        return datetime.strptime(date_str.split('일')[0].strip(), '%Y년 %m월 %d')
                    # 영어 형태 (단순화: 월 이름만으로도 순서 보장됨)
                    return datetime.strptime(date_str, '%B %d-%d, %Y')
                except:
                    return datetime.min
            
            meetings.sort(key=lambda x: parse_fomc_date(x['date']), reverse=True)
        except Exception as sort_err:
            print(f"[Speech API] FOMC sort error: {sort_err}")

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
    limit: int = Query(10, description="조회할 연설문 수"),
    force_refresh: bool = Query(False, description="캐시 무시하고 강제 새로고침")
):
    """
    최근 연설문 목록 조회
    """
    try:
        cache_key = f"recent_speeches_{limit}"
        if not force_refresh:
            cached_data = get_cached(cache_key)
            if cached_data:
                return SpeechListResponse(**cached_data)
        
        print(f"[Speech API] 최근 연설문 목록 조회 (limit={limit})")
        speeches = await fed_speech_scraper.get_recent_speeches(limit)
        
        # 날짜 순 정렬 (ISO 형식 'YYYY-MM-DD' 또는 'January 15, 2025')
        try:
            def parse_speech_date(date_str):
                try:
                    if '-' in date_str:
                        return datetime.strptime(date_str, '%Y-%m-%d')
                    return datetime.strptime(date_str, '%B %d, %Y')
                except:
                    return datetime.min
            
            speeches.sort(key=lambda x: parse_speech_date(x.get('date', '')), reverse=True)
        except Exception as sort_err:
            print(f"[Speech API] Speech sort error: {sort_err}")

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
        
        # 화자 및 영향력 분석
        hawk_dove_score = 50.0  # 0: Dove, 100: Hawk
        market_impact_score = 5
        speaker_info = None
        
        # 주요 화자 DB (간이)
        fed_speakers = {
            "Jerome Powell": {"role": "Chair", "bias": "Neutral/Flexible", "impact": 10},
            "John Williams": {"role": "Vice Chair", "bias": "Neutral/Hawk", "impact": 8},
            "Christopher Waller": {"role": "Governor", "bias": "Hawk", "impact": 8},
            "Michelle Bowman": {"role": "Governor", "bias": "Hawk", "impact": 7},
            "Austan Goolsbee": {"role": "President (Chicago)", "bias": "Dove", "impact": 6},
            "Neel Kashkari": {"role": "President (Minneapolis)", "bias": "Hawk", "impact": 6},
            "Mary Daly": {"role": "President (San Francisco)", "bias": "Dove", "impact": 6},
            "Raphael Bostic": {"role": "President (Atlanta)", "bias": "Neutral", "impact": 6},
            "Patrick Harker": {"role": "President (Philadelphia)", "bias": "Neutral", "impact": 5},
            "Thomas Barkin": {"role": "President (Richmond)", "bias": "Neutral/Hawk", "impact": 5},
        }

        # 화자 이름 매칭 및 점수 산출
        if speaker:
            for name, info in fed_speakers.items():
                if name.lower() in speaker.lower():
                    speaker_info = info
                    market_impact_score = info["impact"]
                    if "Hawk" in info["bias"]: hawk_dove_score = 75.0
                    elif "Dove" in info["bias"]: hawk_dove_score = 25.0
                    break
        elif speech_type == 'minutes':
            market_impact_score = 9  # 회의록은 중요함
            speaker_info = {"role": "Committee", "bias": "Collective"}

        # 감정 분석 보정
        sentiment = 'neutral'
        positive_words = ['긍정', '상승', '개선', '증가', '성장', '안정', '완화', '비둘기', 'dove', 'easing', 'growth']
        negative_words = ['부정', '하락', '악화', '감소', '위험', '불안', '긴축', '매파', 'hawk', 'tightening', 'risk']
        
        summary_lower = summary.lower()
        pos_count = sum(1 for word in positive_words if word.lower() in summary_lower)
        neg_count = sum(1 for word in negative_words if word.lower() in summary_lower)
        
        if pos_count > neg_count:
            sentiment = 'positive'
            hawk_dove_score = max(0, hawk_dove_score - 10)
        elif neg_count > pos_count:
            sentiment = 'negative'
            hawk_dove_score = min(100, hawk_dove_score + 10)

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
            hawk_dove_score=hawk_dove_score,
            market_impact_score=market_impact_score,
            speaker_info=speaker_info,
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
