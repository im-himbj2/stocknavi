"""
경제 지표 API - FMP API 사용 (상업적 사용 가능)
"""
import asyncio
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
from app.services.data.fmp_economic import FMPEconomicProvider
from app.services.data.yahoo_economic import YahooEconomicProvider
from app.services.data.fred_api import FREDDataProvider
from app.services.data.alpha_vantage_economic import AlphaVantageEconomicProvider
from app.services.data.historical_economic_data import get_historical_data
from app.services.scraper.investing_calendar_scraper import InvestingCalendarScraper
from app.services.scraper.economic_calendar_scraper import EconomicCalendarScraper

router = APIRouter()

# 전역 인스턴스
fmp_provider = FMPEconomicProvider()
yahoo_economic = YahooEconomicProvider()
fred_provider = FREDDataProvider()
alpha_vantage_provider = AlphaVantageEconomicProvider()
investing_scraper = InvestingCalendarScraper()
calendar_scraper = EconomicCalendarScraper()

# 간단한 메모리 캐시 (15분마다 자동 업데이트)
_cache = {}
_cache_ttl = {}  # Time To Live
CACHE_DURATION = 900  # 15분 캐시 (경제 캘린더 실시간 업데이트)


def get_cached(key: str):
    """캐시에서 데이터 조회"""
    if key in _cache and key in _cache_ttl:
        if datetime.now() < _cache_ttl[key]:
            return _cache[key]
        else:
            # 캐시 만료
            del _cache[key]
            del _cache_ttl[key]
    return None


def set_cached(key: str, value: Any):
    """캐시에 데이터 저장"""
    _cache[key] = value
    _cache_ttl[key] = datetime.now() + timedelta(seconds=CACHE_DURATION)


class EconomicIndicatorResponse(BaseModel):
    """경제 지표 응답"""
    indicator: str
    data: List[Dict[str, Any]]
    source: str
    cached: bool = False
    updated_at: str


# 경제 캘린더 엔드포인트는 제거됨 (대체 기능으로 시장 심리 지수, 섹터 로테이션, 옵션 플로우 사용)
# @router.get("/economic/calendar", response_model=EconomicIndicatorResponse)
# async def get_economic_calendar(
#     start_date: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
#     end_date: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)")
# ):
#     """
#     경제 캘린더 조회 (비활성화됨)
#     """
#     try:
        # 날짜 범위 설정: 과거 2달 ~ 미래 6개월
        # 과거 2달까지만 표시 (데이터 정확성 보장)
    #     now = datetime.now()
    #     min_allowed_date = (now.replace(day=1) - timedelta(days=60)).replace(day=1)  # 2달 전 1일
    #     max_allowed_date = now + timedelta(days=180)  # 미래 6개월
    #     
    #     if not end_date:
    #         end_date = max_allowed_date.strftime('%Y-%m-%d')
    #     if not start_date:
    #         start_date = min_allowed_date.strftime('%Y-%m-%d')
    #     
        # 요청된 날짜가 허용 범위를 벗어나면 조정
    #     start_dt = datetime.strptime(start_date, '%Y-%m-%d')
    #     end_dt = datetime.strptime(end_date, '%Y-%m-%d')
    #     
    #     if start_dt < min_allowed_date:
    #         start_date = min_allowed_date.strftime('%Y-%m-%d')
    #     if end_dt > max_allowed_date:
    #         end_date = max_allowed_date.strftime('%Y-%m-%d')
    #     
        # 캐시 키 생성 (날짜와 현재 날짜 포함하여 날짜 변경 시 자동 갱신)
    #     today_str = datetime.now().strftime('%Y-%m-%d')
    #     cache_key = f"economic_calendar_{start_date}_{end_date}_{today_str}"
    #     cached_data = get_cached(cache_key)
    #     if cached_data:
            # cached 키를 제거하고 새로 설정하여 중복 방지
    #         cached_data_copy = {k: v for k, v in cached_data.items() if k != 'cached'}
    #         return EconomicIndicatorResponse(**cached_data_copy, cached=True)
    #     
        # 여러 소스에서 경제 캘린더 데이터 가져오기
    #     data = None
    #     data_received = False
    #     data_source = "Sample"
    #     
        # 1. Investing.com 스크래핑 시도 (AJAX API 사용)
    #     try:
    #         print("[Investing] 경제 캘린더 스크래핑 시작...")
    #         raw_data = await asyncio.wait_for(
    #             investing_scraper.get_economic_calendar(start_date, end_date),
    #             timeout=45.0  # 주 단위 수집에 충분한 시간
    #         )
    #         if raw_data and isinstance(raw_data, list) and len(raw_data) > 0:
    #             data = raw_data
    #             data_received = True
    #             data_source = "Investing.com"
    #             print(f"[Investing] SUCCESS: {len(data)}개 이벤트 스크래핑 성공")
    #     except asyncio.TimeoutError:
    #         print("[Investing] WARNING: 타임아웃")
    #     except Exception as e:
    #         error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
    #         if "connection" in error_msg.lower() or "connect" in error_msg.lower():
    #             print("[Investing] 연결 실패")
    #         else:
    #             print(f"[Investing] ERROR: {error_msg}")
    #     
        # 2. 통합 스크래퍼 시도 (Myfxbook, DailyFX, TradingView)
    #     if not data_received:
    #         try:
    #             print("[Calendar] 경제 캘린더 데이터 가져오는 중...")
    #             raw_data = await asyncio.wait_for(
    #                 calendar_scraper.get_economic_calendar(start_date, end_date),
    #                 timeout=8.0
    #             )
    #             if raw_data and isinstance(raw_data, list) and len(raw_data) > 0:
    #                 data = raw_data
    #                 data_received = True
    #                 data_source = "External"
    #                 print(f"[Calendar] SUCCESS: {len(data)}개 이벤트 수신")
    #         except asyncio.TimeoutError:
    #             print("[Calendar] WARNING: 타임아웃 (8초 초과)")
    #         except Exception as e:
    #             error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
    #             print(f"[Calendar] ERROR: {error_msg}")
    #     
        # 3. FMP API 폴백 - 타임아웃 단축
    #     if not data_received:
    #         fmp_api_key = getattr(fmp_provider, 'api_key', None)
    #         if fmp_api_key:
    #             try:
    #                 print("[FMP] FMP API 시도...")
    #                 raw_data = await asyncio.wait_for(
    #                     fmp_provider.get_economic_calendar(start_date, end_date),
    #                     timeout=5.0  # 타임아웃 단축
    #                 )
    #                 if raw_data and isinstance(raw_data, list) and len(raw_data) > 0:
    #                     data = raw_data
    #                     data_received = True
    #                     data_source = "FMP"
    #                     print(f"[FMP] SUCCESS: {len(data)}개 이벤트 FMP API에서 받음")
    #             except Exception:
    #                 pass
    #     
        # 4. Alpha Vantage API 폴백 (무료, 실제 데이터 제공)
    #     if not data_received:
    #         try:
    #             print("[AlphaVantage] Alpha Vantage API 시도...")
    #             raw_data = await asyncio.wait_for(
    #                 alpha_vantage_provider.get_economic_calendar(start_date, end_date),
    #                 timeout=30.0
    #             )
    #             if raw_data and isinstance(raw_data, list) and len(raw_data) > 0:
    #                 data = raw_data
    #                 data_received = True
    #                 data_source = "Alpha Vantage"
    #                 print(f"[AlphaVantage] SUCCESS: {len(data)}개 이벤트 Alpha Vantage에서 받음")
    #         except asyncio.TimeoutError:
    #             print("[AlphaVantage] WARNING: 타임아웃")
    #         except Exception as e:
    #             error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
    #             print(f"[AlphaVantage] ERROR: {error_msg}")
    #     
        # 외부 소스에서 데이터를 받은 경우 처리
    #     if data_received and data:
            # 스크래핑된 데이터를 그대로 사용 (이미 정규화됨)
    #         print(f"[Calendar] Using {len(data)} events from {data_source}")
    #         
            # 날짜별 필터링 및 actual 값 확인
    #         today = datetime.now().date()
    #         processed_data = []
    #         for item in data:
    #             try:
                    # 날짜 파싱
    #                 event_date_str = item.get('date', '')
    #                 if event_date_str:
    #                     event_date = datetime.strptime(event_date_str, '%Y-%m-%d').date()
    #                     
                        # 미래 날짜인 경우 actual이 있으면 제거 (아직 발표되지 않았으므로)
    #                     if event_date > today and item.get('actual'):
    #                         item['actual'] = None
    #                     
    #                     processed_data.append(item)
    #             except (ValueError, TypeError):
    #                 processed_data.append(item)
    #         
    #         data = processed_data
    #         
            # 값 통계 출력
    #         if len(data) > 0:
    #             events_with_actual = sum(1 for e in data if e.get('actual'))
    #             events_with_forecast = sum(1 for e in data if e.get('forecast'))
    #             events_with_previous = sum(1 for e in data if e.get('previous'))
    #             print(f"[Calendar] Statistics: {events_with_actual}/{len(data)} with actual, {events_with_forecast}/{len(data)} with forecast, {events_with_previous}/{len(data)} with previous")
    #     
        # 기본 경제 일정 생성 (샘플 데이터)
        # 외부 데이터와 병합하여 더 많은 이벤트 표시
    #     start = datetime.strptime(start_date, '%Y-%m-%d').date()
    #     end = datetime.strptime(end_date, '%Y-%m-%d').date()
    #     today = datetime.now().date()
    #     
        # 주요 경제 지표 템플릿 (각 날짜에 최대 5개까지 배치)
    #     event_templates = [
            # 미국 지표
    #         {'name': '미국 CPI 발표', 'country': 'US', 'day': 10, 'time': '08:30', 'impact': 'High', 'monthly': True, 'priority': 1},
    #         {'name': '미국 실업률', 'country': 'US', 'day': 1, 'time': '08:30', 'impact': 'High', 'monthly': True, 'priority': 1},
    #         {'name': 'FOMC 기준금리 발표', 'country': 'US', 'day': None, 'time': '14:00', 'impact': 'High', 'fomc': True, 'priority': 1},
    #         {'name': '미국 GDP 발표', 'country': 'US', 'day': 25, 'time': '08:30', 'impact': 'High', 'quarterly': True, 'priority': 1},
    #         {'name': '미국 PPI 발표', 'country': 'US', 'day': 15, 'time': '08:30', 'impact': 'Medium', 'monthly': True, 'priority': 2},
    #         {'name': '미국 소매판매', 'country': 'US', 'day': 15, 'time': '08:30', 'impact': 'Medium', 'monthly': True, 'priority': 2},
    #         {'name': '미국 ISM 제조업지수', 'country': 'US', 'day': 1, 'time': '10:00', 'impact': 'Medium', 'monthly': True, 'priority': 2},
    #         {'name': '미국 신규주택착공', 'country': 'US', 'day': 18, 'time': '08:30', 'impact': 'Low', 'monthly': True, 'priority': 3},
    #         
            # 한국 지표
    #         {'name': '한국 기준금리', 'country': 'KR', 'day': 15, 'time': '10:00', 'impact': 'High', 'monthly': True, 'priority': 1},
    #         {'name': '한국 수출 YoY', 'country': 'KR', 'day': 1, 'time': '08:00', 'impact': 'Medium', 'monthly': True, 'priority': 2},
    #         {'name': '한국 소비자물가', 'country': 'KR', 'day': 5, 'time': '08:00', 'impact': 'Medium', 'monthly': True, 'priority': 2},
    #         {'name': '한국 GDP 발표', 'country': 'KR', 'day': 25, 'time': '08:00', 'impact': 'High', 'quarterly': True, 'priority': 1},
    #         {'name': '한국 실업률', 'country': 'KR', 'day': 12, 'time': '08:00', 'impact': 'Low', 'monthly': True, 'priority': 3},
    #         
            # 유로존 지표
    #         {'name': '유로존 CPI', 'country': 'EU', 'day': 1, 'time': '11:00', 'impact': 'High', 'monthly': True, 'priority': 1},
    #         {'name': '유로존 실업률', 'country': 'EU', 'day': 1, 'time': '11:00', 'impact': 'Medium', 'monthly': True, 'priority': 2},
    #         {'name': 'ECB 금리결정', 'country': 'EU', 'day': None, 'time': '14:45', 'impact': 'High', 'monthly': True, 'priority': 1},
    #         {'name': '유로존 GDP', 'country': 'EU', 'day': 15, 'time': '11:00', 'impact': 'Medium', 'quarterly': True, 'priority': 2},
    #         
            # 중국/일본 지표
    #         {'name': '중국 CPI', 'country': 'CN', 'day': 9, 'time': '05:00', 'impact': 'Medium', 'monthly': True, 'priority': 2},
    #         {'name': '중국 GDP', 'country': 'CN', 'day': 15, 'time': '05:00', 'impact': 'High', 'quarterly': True, 'priority': 1},
    #         {'name': '일본 BOJ 금리결정', 'country': 'JP', 'day': None, 'time': '03:00', 'impact': 'High', 'quarterly': True, 'priority': 1},
    #         {'name': '일본 CPI', 'country': 'JP', 'day': 20, 'time': '08:30', 'impact': 'Medium', 'monthly': True, 'priority': 2},
    #     ]
    #     
    #     sample_events = []
    #     current = start
    #     
    #     while current <= end:
    #         day_events = []
    #         
    #         for template in event_templates:
    #             if len(day_events) >= 5:
    #                 break
    #             
    #             should_add = False
    #             
    #             if template.get('monthly'):
    #                 if current.day == template.get('day', 10):
    #                     should_add = True
    #             elif template.get('quarterly'):
    #                 if current.month in [3, 6, 9, 12] and current.day == template.get('day', 25):
    #                     should_add = True
    #             elif template.get('fomc'):
    #                 days_diff = (current - start).days
    #                 if days_diff >= 0 and days_diff % 42 == 0:
    #                     should_add = True
    #             elif template.get('day') is None:
    #                 if current.day == 15:
    #                     should_add = True
    #             
    #             if should_add:
    #                 day_events.append({
    #                     "event": template['name'],
    #                     "country": template['country'],
    #                     "date": current.isoformat(),
    #                     "time": template['time'],
    #                     "impact": template['impact'],
    #                     "actual": None,
    #                     "forecast": None,
    #                     "previous": None
    #                 })
    #         
    #         day_events.sort(key=lambda x: (
    #             0 if x['impact'] == 'High' else 1 if x['impact'] == 'Medium' else 2,
    #             x['event']
    #         ))
    #         
    #         sample_events.extend(day_events[:5])
    #         current += timedelta(days=1)
    #     
        # 외부 데이터가 있으면 샘플 데이터와 병합
    #     if data_received and data:
            # 외부 데이터를 날짜-이벤트 맵으로 변환
    #         external_data_map = {}
    #         for item in data:
    #             key = f"{item.get('date')}_{item.get('event', '')}"
    #             external_data_map[key] = item
    #         
            # 샘플 데이터에 외부 데이터 병합
    #         merged_data = []
    #         added_keys = set()
    #         
            # 먼저 외부 데이터 추가 (실제 값이 있는 데이터)
    #         for item in data:
    #             merged_data.append(item)
    #             key = f"{item.get('date')}_{item.get('event', '')}"
    #             added_keys.add(key)
    #         
            # 샘플 데이터에서 중복되지 않는 것만 추가
    #         for item in sample_events:
    #             key = f"{item.get('date')}_{item.get('event', '')}"
    #             if key not in added_keys:
    #                 merged_data.append(item)
    #         
    #         data = merged_data
    #         data_source = f"{data_source} + Sample"
    #         print(f"[Calendar] 병합 완료: 외부 {len(external_data_map)}개 + 샘플 {len(sample_events)}개 = 총 {len(data)}개")
    #     else:
            # 외부 데이터가 없으면 샘플 데이터만 사용
    #         data = sample_events
    #         data_source = "Sample"
    #         print(f"[Sample] 샘플 데이터 생성 완료: {len(data)}개 이벤트")
    #     
        # 역사적 경제 지표 데이터 병합 (공식 발표 자료)
    #     historical_data = get_historical_data(start_date, end_date)
    #     if historical_data:
            # 이미 있는 데이터 키 수집
    #         existing_keys = {f"{item.get('date')}_{item.get('event', '')}" for item in data}
    #         
            # 역사적 데이터로 기존 데이터 업데이트 또는 추가
    #         updated_count = 0
    #         for hist_item in historical_data:
    #             key = f"{hist_item.get('date')}_{hist_item.get('event', '')}"
    #             
                # 기존 데이터에서 해당 이벤트 찾아서 업데이트
    #             found = False
    #             for i, item in enumerate(data):
    #                 if f"{item.get('date')}_{item.get('event', '')}" == key:
                        # 실제 값이 없는 경우에만 역사적 데이터로 업데이트
    #                     if not item.get('actual') and hist_item.get('actual'):
    #                         data[i]['actual'] = hist_item['actual']
    #                         data[i]['forecast'] = hist_item.get('forecast')
    #                         data[i]['previous'] = hist_item.get('previous')
    #                         updated_count += 1
    #                     found = True
    #                     break
    #             
                # 기존 데이터에 없으면 추가
    #             if not found:
    #                 data.append(hist_item)
    #                 updated_count += 1
    #         
    #         if updated_count > 0:
    #             print(f"[Historical] 역사적 데이터 {updated_count}개 병합 완료")
    #     
    #     print(f"[API] 최종 데이터 소스: {data_source}, 이벤트 수: {len(data) if data else 0}")
    #     
    #     result = EconomicIndicatorResponse(
    #         indicator="economic_calendar",
    #         data=data,
    #         source=data_source,
    #         cached=False,
    #         updated_at=datetime.now().isoformat()
    #     )
    #     
        # 캐시 저장
    #     set_cached(cache_key, result.model_dump())
    #     
    #     return result
    #     
    # except HTTPException:
    #     raise
    # except Exception as e:
        # 에러 메시지에서 이모지 제거 (cp949 인코딩 오류 방지)
    #     error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
    #     if not error_msg:
    #         error_msg = "경제 캘린더 조회 중 오류가 발생했습니다."
    #     raise HTTPException(status_code=500, detail=f"경제 캘린더 조회 실패: {error_msg}")


@router.get("/economic/treasury", response_model=EconomicIndicatorResponse)
async def get_treasury_rates():
    """
    국채 수익률 조회
    """
    try:
        # 캐시 키 생성
        cache_key = "treasury_rates"
        cached_data = get_cached(cache_key)
        if cached_data:
            # cached 키를 제거하고 새로 설정하여 중복 방지
            cached_data_copy = {k: v for k, v in cached_data.items() if k != 'cached'}
            return EconomicIndicatorResponse(**cached_data_copy, cached=True)
        
        # FMP API 호출
        data = await fmp_provider.get_treasury_rates()
        
        # 데이터가 없어도 빈 배열로 반환
        if not data:
            data = []
        
        result = EconomicIndicatorResponse(
            indicator="treasury_rates",
            data=data,
            source="FMP",
            cached=False,
            updated_at=datetime.now().isoformat()
        )
        
        # 캐시 저장
        set_cached(cache_key, result.model_dump())
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"국채 수익률 조회 실패: {str(e)}")


@router.get("/economic/indices", response_model=EconomicIndicatorResponse)
async def get_market_indices():
    """
    주요 시장 지수 조회
    """
    try:
        # 캐시 키 생성
        cache_key = "market_indices"
        cached_data = get_cached(cache_key)
        if cached_data:
            # cached 키를 제거하고 새로 설정하여 중복 방지
            cached_data_copy = {k: v for k, v in cached_data.items() if k != 'cached'}
            return EconomicIndicatorResponse(**cached_data_copy, cached=True)
        
        # FMP API 호출
        data = await fmp_provider.get_market_indices()
        
        # FMP API가 실패하면 Yahoo Finance로 폴백
        if not data:
            try:
                # 사용자 요청에 맞춘 주요 지수 목록
                indices_symbols = [
                    # 미국
                    '^GSPC',     # S&P500
                    '^DJI',      # Dow Jones
                    '^IXIC',     # NASDAQ
                    '^RUT',      # Russell 2000
                    # 한국
                    '^KS11',     # KOSPI
                    '^KQ11',     # KOSDAQ
                    # 일본
                    '^N225',     # Nikkei 225
                    # 독일
                    '^GDAXI',    # DAX 40
                    '^TECDAX',   # TecDAX
                    # 영국
                    '^FTSE',     # FTSE 100
                    # 중국/홍콩 (상하이 종합은 Yahoo Finance에서 지원하지 않을 수 있음)
                    # '000001.SS', # 상하이 종합 - 주석 처리 (작동하지 않음)
                    '^HSI',      # 항셍
                ]
                fallback_data = []
                for symbol in indices_symbols:
                    try:
                        # 타임아웃을 고려하여 빠르게 실패 처리
                        try:
                            yahoo_data = await asyncio.wait_for(
                                yahoo_economic.get_economic_data(symbol),
                                timeout=5.0  # 5초 타임아웃
                            )
                        except asyncio.TimeoutError:
                            print(f"[Yahoo] Timeout for {symbol}, skipping...")
                            continue
                        except asyncio.CancelledError:
                            # 서버 종료 시 취소된 작업은 조용히 처리
                            break
                        
                        if yahoo_data and yahoo_data.get('current_value'):
                            # 이전 가격과 비교하여 변경률 계산
                            hist_data = yahoo_data.get('data', [])
                            change_percent = 0
                            if hist_data and len(hist_data) >= 2:
                                current = hist_data[-1].get('value', yahoo_data['current_value'])
                                previous = hist_data[-2].get('value', current)
                                if previous > 0:
                                    change_percent = ((current - previous) / previous) * 100
                            
                            fallback_data.append({
                                'symbol': symbol.replace('^', '').replace('.SS', ''),
                                'price': yahoo_data['current_value'],
                                'change': change_percent,
                                'changePercent': change_percent
                            })
                    except Exception as e:
                        print(f"[Yahoo] Error fetching {symbol}: {e}")
                        continue
                if fallback_data:
                    data = fallback_data
                else:
                    data = []
            except:
                data = []
        
        result = EconomicIndicatorResponse(
            indicator="market_indices",
            data=data,
            source="FMP",
            cached=False,
            updated_at=datetime.now().isoformat()
        )
        
        # 캐시 저장
        set_cached(cache_key, result.model_dump())
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시장 지수 조회 실패: {str(e)}")


@router.get("/economic/treasury-yahoo/{maturity}")
async def get_treasury_yahoo(maturity: str = "10y"):
    """
    Yahoo Finance를 통한 국채 수익률 조회 (무료, 대역폭 절약)
    
    - **maturity**: 만기 (10y, 5y, 30y)
    """
    try:
        cache_key = f"treasury_yahoo_{maturity}"
        cached_data = get_cached(cache_key)
        if cached_data:
            return cached_data
        
        symbol_map = {
            "10y": "^TNX",
            "5y": "^FVX",
            "30y": "^TYX"
        }
        
        symbol = symbol_map.get(maturity, "^TNX")
        data = await yahoo_economic.get_economic_data(symbol)
        
        if not data:
            data = []
        
        result = {
            "indicator": f"treasury_{maturity}",
            "data": data,
            "source": "Yahoo Finance",
            "cached": False,
            "updated_at": datetime.now().isoformat()
        }
        
        set_cached(cache_key, result)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"국채 수익률 조회 실패: {str(e)}")


@router.get("/economic/api-usage")
async def get_api_usage_info():
    """
    API 사용량 정보 (캐시 히트율 등)
    """
    total_requests = len(_cache)
    return {
        "total_cached_items": total_requests,
        "cache_duration_seconds": CACHE_DURATION,
        "fmp_daily_limit": 250,
        "bandwidth_limit_gb": 20,
        "note": "캐시를 통해 API 호출을 최소화합니다. 같은 데이터는 1시간 동안 캐시됩니다."
    }


@router.get("/market-sentiment", response_model=EconomicIndicatorResponse)
async def get_market_sentiment():
    """
    시장 심리 지수 (Fear & Greed Index) 조회
    """
    try:
        cache_key = "market_sentiment"
        cached_data = get_cached(cache_key)
        if cached_data:
            return EconomicIndicatorResponse(**cached_data, cached=True)
        
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Alternative.me Fear & Greed Index API
            response = await client.get("https://api.alternative.me/fng/")
            if response.status_code == 200:
                data = response.json()
                fng_data = data.get("data", [{}])[0] if data.get("data") else {}
                
                sentiment_value = int(fng_data.get("value", 50))
                sentiment_classification = fng_data.get("value_classification", "Neutral")
                
                result = {
                    "indicator": "market_sentiment",
                    "data": [{
                        "value": sentiment_value,
                        "classification": sentiment_classification,
                        "timestamp": fng_data.get("timestamp"),
                        "time_until_update": fng_data.get("time_until_update")
                    }],
                    "source": "alternative.me",
                    "updated_at": datetime.now().isoformat()
                }
                
                set_cached(cache_key, result)
                return EconomicIndicatorResponse(**result)
            else:
                raise HTTPException(status_code=500, detail="시장 심리 지수 조회 실패")
    except Exception as e:
        print(f"[Market Sentiment] 오류: {e}")
        # 샘플 데이터 반환
        return EconomicIndicatorResponse(
            indicator="market_sentiment",
            data=[{
                "value": 50,
                "classification": "Neutral",
                "timestamp": str(int(datetime.now().timestamp())),
                "time_until_update": None
            }],
            source="sample",
            updated_at=datetime.now().isoformat()
        )


@router.get("/sector-rotation", response_model=EconomicIndicatorResponse)
async def get_sector_rotation():
    """
    섹터 로테이션 분석 (S&P 500 섹터별 성과)
    """
    try:
        cache_key = "sector_rotation"
        cached_data = get_cached(cache_key)
        if cached_data:
            return EconomicIndicatorResponse(**cached_data, cached=True)
        
        import yfinance as yf
        # S&P 500 섹터 ETF 심볼
        sector_etfs = {
            "XLK": "Technology",
            "XLV": "Healthcare",
            "XLE": "Energy",
            "XLF": "Financials",
            "XLI": "Industrials",
            "XLY": "Consumer Discretionary",
            "XLP": "Consumer Staples",
            "XLU": "Utilities",
            "XLB": "Materials",
            "XLRE": "Real Estate",
            "XLC": "Communication Services"
        }
        
        sector_data = []
        for symbol, name in sector_etfs.items():
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                hist = ticker.history(period="1mo")
                
                if not hist.empty:
                    current_price = hist['Close'].iloc[-1]
                    prev_price = hist['Close'].iloc[0] if len(hist) > 1 else current_price
                    change_pct = ((current_price - prev_price) / prev_price) * 100
                    
                    sector_data.append({
                        "symbol": symbol,
                        "name": name,
                        "price": float(current_price),
                        "change_percent": float(change_pct),
                        "market_cap": info.get("marketCap", 0)
                    })
            except Exception as e:
                print(f"[Sector Rotation] {symbol} 조회 실패: {e}")
                continue
        
        # 성과 순으로 정렬
        sector_data.sort(key=lambda x: x["change_percent"], reverse=True)
        
        result = {
            "indicator": "sector_rotation",
            "data": sector_data,
            "source": "yfinance",
            "updated_at": datetime.now().isoformat()
        }
        
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        print(f"[Sector Rotation] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"섹터 로테이션 조회 실패: {str(e)}")


@router.get("/options-flow", response_model=EconomicIndicatorResponse)
async def get_options_flow():
    """
    옵션 플로우 분석 (큰 자금의 옵션 거래 추적)
    """
    try:
        cache_key = "options_flow"
        cached_data = get_cached(cache_key)
        if cached_data:
            return EconomicIndicatorResponse(**cached_data, cached=True)
        
        # FMP API를 사용하여 옵션 플로우 데이터 조회 (있는 경우)
        # 또는 샘플 데이터 반환
        sample_data = [
            {
                "symbol": "SPY",
                "type": "call",
                "strike": 450.0,
                "expiry": "2024-12-20",
                "volume": 100000,
                "open_interest": 500000,
                "premium": 5.50,
                "sentiment": "bullish"
            },
            {
                "symbol": "QQQ",
                "type": "put",
                "strike": 380.0,
                "expiry": "2024-12-20",
                "volume": 75000,
                "open_interest": 300000,
                "premium": 3.25,
                "sentiment": "bearish"
            }
        ]
        
        result = {
            "indicator": "options_flow",
            "data": sample_data,
            "source": "sample",
            "updated_at": datetime.now().isoformat(),
            "note": "옵션 플로우 데이터는 샘플입니다. 실제 API 연동 필요"
        }
        
        set_cached(cache_key, result)
        return EconomicIndicatorResponse(**result)
    except Exception as e:
        print(f"[Options Flow] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"옵션 플로우 조회 실패: {str(e)}")









