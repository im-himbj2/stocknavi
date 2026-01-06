"""
FRED API를 통한 경제 지표 데이터 수집 모듈
"""
import httpx
from typing import List, Optional, Dict, Set
from datetime import datetime, timedelta
from app.core.config import settings


class FREDDataProvider:
    """FRED API를 통한 경제 지표 데이터 제공자"""
    
    def __init__(self):
        self.name = "FRED"
        self.api_key = settings.FRED_API_KEY
        self.base_url = "https://api.stlouisfed.org/fred"
        # 저작권이 있는 시리즈 ID 캐시 (성능 최적화)
        self._copyrighted_series_cache: Optional[Set[str]] = None
        self._copyright_cache_time: Optional[datetime] = None
    
    async def get_series(
        self,
        series_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Optional[Dict]:
        """
        경제 지표 시리즈 데이터 조회
        
        Args:
            series_id: FRED 시리즈 ID (예: 'GDP', 'UNRATE', 'CPIAUCSL')
            start_date: 시작 날짜 (YYYY-MM-DD)
            end_date: 종료 날짜 (YYYY-MM-DD)
        
        Returns:
            시리즈 데이터 딕셔너리 또는 None (저작권이 있는 경우)
            
        Raises:
            ValueError: 저작권이 있는 시리즈인 경우
        """
        if not self.api_key:
            return None
        
        # 저작권 확인 (FRED API 이용약관 준수)
        is_copyrighted = await self.check_series_copyright(series_id)
        if is_copyrighted:
            print(f"[FRED] 시리즈 {series_id}는 저작권이 있어 사용할 수 없습니다.")
            raise ValueError(
                f"시리즈 {series_id}는 저작권이 있는 데이터입니다. "
                "FRED API 이용약관에 따라 제3자 소유 데이터는 허가 없이 사용할 수 없습니다."
            )
        
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=365*5)).strftime('%Y-%m-%d')
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/series/observations",
                    params={
                        "series_id": series_id,
                        "api_key": self.api_key,
                        "file_type": "json",
                        "observation_start": start_date,
                        "observation_end": end_date,
                        "sort_order": "asc"
                    },
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                
                return {
                    'series_id': series_id,
                    'observations': [
                        {
                            'date': obs['date'],
                            'value': float(obs['value']) if obs['value'] != '.' else None
                        }
                        for obs in data.get('observations', [])
                        if obs['value'] != '.'
                    ]
                }
                
        except ValueError:
            # 저작권 에러는 그대로 전달
            raise
        except Exception as e:
            print(f"[FRED] Error fetching series {series_id}: {e}")
            return None
    
    async def search_series(
        self,
        search_text: str,
        limit: int = 100
    ) -> List[Dict]:
        """
        시리즈 검색 (저작권이 없는 시리즈만 반환)
        
        Args:
            search_text: 검색어
            limit: 최대 결과 수
            
        Returns:
            저작권이 없는 시리즈 리스트
        """
        if not self.api_key:
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/series/search",
                    params={
                        "search_text": search_text,
                        "api_key": self.api_key,
                        "file_type": "json",
                        "limit": limit,
                        "sort_order": "popularity"
                    },
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    return []
                
                data = response.json()
                series_list = data.get('seriess', [])
                
                # 저작권이 없는 시리즈만 필터링
                non_copyrighted = []
                for series in series_list:
                    notes = series.get('notes', '')
                    if not self._is_copyrighted(notes):
                        non_copyrighted.append({
                            'id': series.get('id'),
                            'title': series.get('title'),
                            'units': series.get('units'),
                            'frequency': series.get('frequency'),
                        })
                
                return non_copyrighted
                
        except Exception as e:
            print(f"[FRED] Error searching series: {e}")
            return []
    
    def _is_copyrighted(self, notes: Optional[str]) -> bool:
        """
        시리즈가 저작권이 있는지 확인
        
        Args:
            notes: 시리즈의 notes 필드
            
        Returns:
            저작권이 있으면 True, 없으면 False
        """
        if not notes:
            return False
        # 'Copyright' 또는 'copyright'가 포함되어 있는지 확인
        return 'copyright' in notes.lower()
    
    async def check_series_copyright(self, series_id: str) -> bool:
        """
        시리즈가 저작권이 있는지 확인
        
        Args:
            series_id: FRED 시리즈 ID
            
        Returns:
            저작권이 있으면 True, 없으면 False
        """
        if not self.api_key:
            return False
        
        try:
            series_info = await self.get_series_info(series_id)
            if not series_info:
                return False
            
            notes = series_info.get('notes', '')
            return self._is_copyrighted(notes)
        except Exception as e:
            print(f"[FRED] Error checking copyright for {series_id}: {e}")
            # 에러 발생 시 안전하게 True 반환 (저작권이 있을 수 있으므로 사용 금지)
            return True
    
    async def get_series_info(self, series_id: str) -> Optional[Dict]:
        """
        시리즈 정보 조회
        
        Args:
            series_id: FRED 시리즈 ID
            
        Returns:
            시리즈 정보 딕셔너리 (notes 포함)
        """
        if not self.api_key:
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/series",
                    params={
                        "series_id": series_id,
                        "api_key": self.api_key,
                        "file_type": "json"
                    },
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                series = data.get('seriess', [{}])[0]
                
                return {
                    'id': series.get('id'),
                    'title': series.get('title'),
                    'units': series.get('units'),
                    'frequency': series.get('frequency'),
                    'seasonal_adjustment': series.get('seasonal_adjustment'),
                    'notes': series.get('notes', ''),
                    'is_copyrighted': self._is_copyrighted(series.get('notes', ''))
                }
                
        except Exception as e:
            print(f"[FRED] Error fetching series info for {series_id}: {e}")
            return None
    
    async def get_economic_calendar(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Optional[List[Dict]]:
        """
        FRED 데이터를 기반으로 경제 캘린더 생성 (최적화 버전)
        주요 지표의 발표 일정을 미리 계산하여 생성 (API 호출 최소화)
        
        Args:
            start_date: 시작 날짜 (YYYY-MM-DD)
            end_date: 종료 날짜 (YYYY-MM-DD)
            
        Returns:
            경제 캘린더 이벤트 리스트
        """
        # FRED API는 너무 느려서 사용하지 않음
        # 대신 샘플 데이터나 FMP API를 사용
        return None

