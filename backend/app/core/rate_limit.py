"""
Rate Limiting 미들웨어
"""
from fastapi import Request, HTTPException
from typing import Dict
from datetime import datetime, timedelta
from collections import defaultdict

# 간단한 메모리 기반 rate limiter (프로덕션에서는 Redis 사용 권장)
_rate_limit_store: Dict[str, list] = defaultdict(list)


async def rate_limit_middleware(request: Request, limit: int = 100, window: int = 60):
    """
    Rate limiting 미들웨어
    
    Args:
        limit: 시간당 허용 요청 수
        window: 시간 윈도우 (초)
    """
    client_ip = request.client.host if request.client else "unknown"
    
    # API 경로별로 다른 제한 적용
    path = request.url.path
    
    # 엄격한 제한이 필요한 엔드포인트
    if "/api/company/" in path:
        limit = 20  # 기업 분석은 더 엄격한 제한
    elif "/api/subscription/" in path:
        limit = 10  # 구독 관련은 더 엄격한 제한
    
    now = datetime.now()
    key = f"{client_ip}:{path}"
    
    # 오래된 요청 제거
    _rate_limit_store[key] = [
        timestamp for timestamp in _rate_limit_store[key]
        if now - timestamp < timedelta(seconds=window)
    ]
    
    # 제한 초과 확인
    if len(_rate_limit_store[key]) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"너무 많은 요청입니다. {window}초 후 다시 시도해주세요."
        )
    
    # 현재 요청 기록
    _rate_limit_store[key].append(now)
    
    return True





















