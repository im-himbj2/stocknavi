"""
Caching utilities
"""
import json
import redis
from typing import Optional, Any
from app.core.config import settings
from functools import wraps
import hashlib


class CacheManager:
    """캐시 관리자"""
    
    def __init__(self):
        try:
            self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            self.redis_available = True
        except Exception as e:
            print(f"[Cache] Redis not available: {e}")
            self.redis_client = None
            self.redis_available = False
            # 인메모리 캐시로 폴백
            self.memory_cache = {}
    
    def get(self, key: str) -> Optional[Any]:
        """캐시에서 값 가져오기"""
        if self.redis_available and self.redis_client:
            try:
                value = self.redis_client.get(key)
                if value:
                    return json.loads(value)
            except Exception as e:
                print(f"[Cache] Error getting key {key}: {e}")
        else:
            # 인메모리 캐시
            return self.memory_cache.get(key)
        return None
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """캐시에 값 저장"""
        try:
            serialized = json.dumps(value)
            if self.redis_available and self.redis_client:
                self.redis_client.setex(key, ttl, serialized)
            else:
                # 인메모리 캐시 (TTL은 간단하게 구현)
                self.memory_cache[key] = value
            return True
        except Exception as e:
            print(f"[Cache] Error setting key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """캐시에서 값 삭제"""
        try:
            if self.redis_available and self.redis_client:
                self.redis_client.delete(key)
            else:
                self.memory_cache.pop(key, None)
            return True
        except Exception as e:
            print(f"[Cache] Error deleting key {key}: {e}")
            return False
    
    def generate_key(self, prefix: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [prefix]
        key_parts.extend(str(arg) for arg in args)
        key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
        key_string = ":".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()


# 전역 캐시 인스턴스
cache_manager = CacheManager()


def cached(ttl: int = 3600, prefix: str = "cache"):
    """함수 결과 캐싱 데코레이터"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = cache_manager.generate_key(
                prefix,
                func.__name__,
                *args,
                **kwargs
            )
            
            # 캐시에서 확인
            cached_value = cache_manager.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 함수 실행
            result = await func(*args, **kwargs)
            
            # 결과 캐싱
            if result is not None:
                cache_manager.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

