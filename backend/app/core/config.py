"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    DATABASE_URL: str = "postgresql://stockuser:stockpass@localhost:5432/stock_portfolio"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # API Keys
    ALPHA_VANTAGE_API_KEY: Optional[str] = None
    FRED_API_KEY: Optional[str] = None
    FMP_API_KEY: Optional[str] = None  # Financial Modeling Prep API Key
    
    # AI Services
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None  # 무료 AI API (https://console.groq.com)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    
    # Toss Payments (토스페이먼츠)
    TOSS_PAYMENTS_SECRET_KEY: Optional[str] = None
    TOSS_PAYMENTS_CLIENT_KEY: Optional[str] = None
    TOSS_PAYMENTS_WEBHOOK_SECRET: Optional[str] = None
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    
    # Frontend
    FRONTEND_URL: Optional[str] = "http://localhost:5173"
    
    # Environment
    ENVIRONMENT: str = "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # .env 파일의 추가 필드는 무시


settings = Settings()

