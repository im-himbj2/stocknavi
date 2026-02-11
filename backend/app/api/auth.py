"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional
from app.core.database import get_db, SessionLocal
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.core.config import settings
from pydantic import BaseModel, EmailStr
import httpx
import jwt
from app.models.user import User
from app.models.subscription import Subscription
from app.api.deps import oauth2_scheme, get_current_user

router = APIRouter()


class UserCreate(BaseModel):
    """User creation schema"""
    email: EmailStr
    password: str
    full_name: str | None = None


class UserResponse(BaseModel):
    """User response schema"""
    id: int
    email: str
    full_name: str | None
    subscription_tier: str
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str


class GoogleToken(BaseModel):
    """Google ID token schema"""
    id_token: str


# get_current_user and get_current_user_optional moved to app.api.deps


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    if SessionLocal is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="데이터베이스가 초기화되지 않았습니다. PostgreSQL 서버가 실행 중인지 확인하세요."
        )
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


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
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@router.post("/google/login", response_model=Token)
async def google_login(google_token: GoogleToken, db: Session = Depends(get_db)):
    """Login with Google OAuth"""
    if SessionLocal is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="데이터베이스가 초기화되지 않았습니다. PostgreSQL 서버가 실행 중인지 확인하세요."
        )
    
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth가 설정되지 않았습니다."
        )
    
    try:
        # Google ID 토큰 검증 (httpx를 사용하여 직접 검증)
        async with httpx.AsyncClient() as client:
            verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={google_token.id_token}"
            response = await client.get(verify_url)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Google 토큰 검증 실패"
                )
            
            idinfo = response.json()
            
            # 클라이언트 ID 확인 (디버깅용 로그)
            token_aud = idinfo.get('aud')
            expected_client_id = settings.GOOGLE_CLIENT_ID
            print(f"[Google OAuth Debug] 토큰의 aud: {token_aud}")
            print(f"[Google OAuth Debug] 설정된 GOOGLE_CLIENT_ID: {expected_client_id}")
            
            if token_aud != expected_client_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"토큰의 클라이언트 ID가 일치하지 않습니다. 토큰: {token_aud}, 설정: {expected_client_id}"
                )
        
        # 사용자 정보 추출
        google_id = idinfo.get('sub')
        email = idinfo.get('email')
        full_name = idinfo.get('name')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이메일 정보를 가져올 수 없습니다."
            )
        
        # 기존 사용자 확인 (이메일 또는 구글 ID로)
        user = db.query(User).filter(
            (User.email == email) | (User.google_id == google_id)
        ).first()
        
        if user:
            # 기존 사용자 업데이트
            if not user.google_id:
                user.google_id = google_id
            if not user.auth_provider or user.auth_provider == "email":
                user.auth_provider = "google"
            if full_name and not user.full_name:
                user.full_name = full_name
            db.commit()
            db.refresh(user)
        else:
            # 새 사용자 생성
            user = User(
                email=email,
                full_name=full_name,
                google_id=google_id,
                auth_provider="google",
                hashed_password=None  # OAuth 사용자는 비밀번호 없음
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # JWT 토큰 생성
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Google OAuth] 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google 로그인 중 오류가 발생했습니다."
        )

