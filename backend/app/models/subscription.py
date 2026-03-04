"""
Subscription Model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Subscription(Base):
    """Subscription model"""
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    tier = Column(String, nullable=False, default="free")
    is_active = Column(Boolean, default=True)
    toss_payment_id = Column(String, nullable=True, unique=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="subscription")


# Add relationship to User model
from app.models.user import User
User.subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")

