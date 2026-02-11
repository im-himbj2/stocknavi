"""
Financial Modeling Prep (FMP) API - 상업적 사용 가능
경제 지표 및 주식 데이터 제공
"""
import httpx
import asyncio
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from app.core.config import settings


class FMPEconomicProvider:
    """Financial Modeling Prep를 통한 경제 지표 데이터 제공자 (상업적 사용 가능)"""
    
    def __init__(self):
        self.name = "Financial Modeling Prep"
        self.api_key = getattr(settings, 'FMP_API_KEY', None)
        # FMP API v4 사용 (v3는 레거시로 더 이상 지원 안 됨)
        # v4가 최신 버전이며 stable은 리다이렉트됨
        self.base_url = "https://financialmodelingprep.com/api/v4"
    
    async def get_economic_indicator(
        self,
        indicator: str,
        name: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Optional[Dict]:
        """
        경제 지표 데이터 조회
        
        Args:
            indicator: 지표 타입 (v4 기준: economic, treasury, economic-calendar 등)
            name: 구체적인 지표 이름 (GDP, CPI 등)
            start_date: 시작 날짜 (YYYY-MM-DD)
            end_date: 종료 날짜 (YYYY-MM-DD)
        
        Returns:
            지표 데이터 딕셔너리
        """
        if not self.api_key:
            print(f"[FMP] API 키가 없습니다.")
            return None
        
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')
            
            # API URL 구성
            url = f"{self.base_url}/{indicator}"
            params = {
                "apikey": self.api_key,
                "from": start_date,
                "to": end_date
            }
            if name:
                params["name"] = name
            
            async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
                response = await client.get(
                    url,
                    params=params
                )
                
                if response.status_code != 200:
                    # 403 오류는 예상된 동작이므로 조용히 처리
                    if response.status_code == 403:
                        return None
                    # 다른 오류는 로그 출력
                    print(f"[FMP] HTTP 오류: {response.status_code}")
                    return None
                
                data = response.json()
                
                if isinstance(data, dict):
                    if "Error Message" in data or "Error" in data:
                        return None
                
                # 성공한 경우에만 간단히 로그
                if isinstance(data, list) and len(data) > 0:
                    print(f"[FMP] {len(data)}개 이벤트 수신")
                
                return data
                
        except (httpx.TimeoutException, asyncio.TimeoutError) as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            print(f"[FMP] WARNING: 타임아웃 오류 (15초 초과): {error_msg}")
            return None
        except httpx.HTTPStatusError as e:
            print(f"[FMP] HTTP 상태 오류: {e.response.status_code}")
            print(f"[FMP] 응답 내용: {e.response.text[:500]}")
            return None
        except httpx.HTTPError as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            print(f"[FMP] HTTP 오류: {error_msg}")
            return None
        except Exception as e:
            error_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
            print(f"[FMP] Error fetching {indicator}: {error_msg}")
            return None
    
    async def get_economic_calendar(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Optional[List[Dict]]:
        """경제 캘린더 조회"""
        # FMP API stable 버전은 economicCalendar (camelCase) 사용
        # 여러 엔드포인트 시도
        endpoints_to_try = [
            "economicCalendar",  # camelCase (가장 일반적)
            "economic_calendar",  # snake_case
            "economic-calendar",  # kebab-case
        ]
        
        for endpoint in endpoints_to_try:
            data = await self.get_economic_indicator(endpoint, start_date, end_date)
            if data:
                print(f"[FMP] SUCCESS: {endpoint} 성공!")
                break
        
        if not data:
            # 403 오류는 예상된 동작이므로 간단히만 로그
            print("[FMP] 모든 엔드포인트 실패 (레거시 엔드포인트, 예상됨)")
            return None
        
        # FMP API 응답이 리스트인 경우 그대로 반환
        if isinstance(data, list):
            # 데이터 정규화 (필드명 통일 - FMP API 실제 필드명 사용)
            normalized = []
            for item in data:
                if isinstance(item, dict):
                    # FMP API 필드명 확인 (대소문자 구분 없이)
                    # FMP API는 다양한 필드명을 사용할 수 있음
                    actual_value = (
                        item.get("actual") or item.get("Actual") or 
                        item.get("actualValue") or item.get("ActualValue") or
                        item.get("value") or item.get("Value") or None
                    )
                    forecast_value = (
                        item.get("estimate") or item.get("Estimate") or 
                        item.get("forecast") or item.get("Forecast") or
                        item.get("estimatedValue") or item.get("EstimatedValue") or None
                    )
                    previous_value = (
                        item.get("previous") or item.get("Previous") or 
                        item.get("prior") or item.get("Prior") or
                        item.get("previousValue") or item.get("PreviousValue") or None
                    )
                    
                    # 빈 문자열을 None으로 변환
                    if actual_value == "":
                        actual_value = None
                    if forecast_value == "":
                        forecast_value = None
                    if previous_value == "":
                        previous_value = None
                    
                    normalized_item = {
                        "event": item.get("event") or item.get("Event") or item.get("name") or item.get("Name") or "",
                        "country": item.get("country") or item.get("Country") or "",
                        "date": item.get("date") or item.get("Date") or "",
                        "time": item.get("time") or item.get("Time") or "",
                        "impact": item.get("impact") or item.get("Impact") or "Medium",
                        "forecast": forecast_value,
                        "actual": actual_value,
                        "previous": previous_value
                    }
                    
                    # 디버깅: 값이 있는 경우 로그
                    if actual_value or forecast_value or previous_value:
                        print(f"[FMP] Event {normalized_item['event']} on {normalized_item['date']}: actual={actual_value}, forecast={forecast_value}, previous={previous_value}")
                    
                    # 빈 값이 아닌 경우만 추가
                    if normalized_item["event"] and normalized_item["date"]:
                        normalized.append(normalized_item)
            return normalized if normalized else None
        
        return None
    
    async def get_treasury_rates(self) -> Optional[List[Dict]]:
        """국채 수익률 조회"""
        if not self.api_key:
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/treasury",
                    params={"apikey": self.api_key},
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                return data if isinstance(data, list) else None
                
        except Exception as e:
            print(f"[FMP] Error fetching treasury rates: {e}")
            return None
    
    async def get_market_indices(self) -> Optional[List[Dict]]:
        """주요 시장 지수 조회"""
        if not self.api_key:
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/quotes/index",
                    params={"apikey": self.api_key},
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                return data if isinstance(data, list) else None
                
        except Exception as e:
            print(f"[FMP] Error fetching market indices: {e}")
            return None









