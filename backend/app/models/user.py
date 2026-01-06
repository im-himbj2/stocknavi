"""
User Model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class SubscriptionTier(str, enum.Enum):
    """Subscription tier enum"""
    FREE = "free"
    PREMIUM = "premium"


class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # OAuth 사용자는 비밀번호 없을 수 있음
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    subscription_tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE)
    google_id = Column(String, unique=True, index=True, nullable=True)  # 구글 사용자 ID
    auth_provider = Column(String, default="email")  # "email" or "google"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

