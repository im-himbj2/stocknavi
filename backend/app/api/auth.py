"""
Authentication API endpoints
"""
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional
from app.core.database import get_db, SessionLocal
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.core.config import settings
from pydantic import BaseModel, EmailStr
from app.models.user import User, SubscriptionTier
from app.api.deps import oauth2_scheme, get_current_user, get_current_user_optional
from app.services.email import send_verification_email

router = APIRouter()


class UserCreate(BaseModel):
    """User creation schema"""
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    """User response schema"""
    id: int
    email: str
    full_name: Optional[str]
    subscription_tier: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user and send verification email"""
    if SessionLocal is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="데이터베이스가 초기화되지 않았습니다. PostgreSQL 서버가 실행 중인지 확인하세요."
        )
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        if not existing_user.is_active:
            # 미인증 계정 → 인증 메일 재발송
            new_token = secrets.token_urlsafe(32)
            existing_user.verification_token = new_token
            db.commit()
            try:
                await send_verification_email(user_data.email, new_token)
            except Exception as e:
                print(f"[Auth] 이메일 재발송 실패: {e}")
            return {"message": "인증 이메일을 재발송했습니다. 받은편지함을 확인해주세요.", "email": user_data.email}
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 등록된 이메일입니다."
        )

    # Create new user (is_active=False until email verified)
    hashed_password = get_password_hash(user_data.password)
    verification_token = secrets.token_urlsafe(32)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        subscription_tier=SubscriptionTier.FREE,
        is_active=False,
        verification_token=verification_token
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send verification email (non-blocking - don't fail registration on email error)
    try:
        await send_verification_email(user_data.email, verification_token)
    except Exception as e:
        print(f"[Auth] 이메일 발송 실패 (계정은 생성됨): {e}")

    return {"message": "회원가입이 완료되었습니다. 인증 이메일을 확인해주세요.", "email": user_data.email}


@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """이메일 인증 토큰 확인 후 계정 활성화"""
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않거나 이미 사용된 인증 링크입니다."
        )
    user.is_active = True
    user.verification_token = None
    db.commit()

    # 인증 완료 후 로그인 페이지로 리다이렉트
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?verified=true")


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login user and get access token"""
    if SessionLocal is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="데이터베이스가 초기화되지 않았습니다. PostgreSQL 서버가 실행 중인지 확인하세요."
        )
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이메일 인증이 필요합니다. 가입 시 발송된 이메일을 확인해주세요."
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user_optional)):
    """Get current user information"""
    if not current_user:
        return None
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "subscription_tier": current_user.subscription_tier
    }
