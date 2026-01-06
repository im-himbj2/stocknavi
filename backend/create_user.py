"""
사용자 생성 스크립트
"""
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models.user import User, SubscriptionTier
import bcrypt

def create_user():
    """기본 사용자 생성"""
    # 데이터베이스 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        email = "kkh08050212@gmail.com"
        password = "password123"  # 기본 비밀번호 (나중에 변경 가능)
        
        # 이미 존재하는 사용자 확인
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"[OK] 사용자 '{email}'가 이미 존재합니다.")
            print(f"   사용자 ID: {existing_user.id}")
            print(f"   구독 등급: {existing_user.subscription_tier}")
            return existing_user
        
        # 새 사용자 생성 - bcrypt 직접 사용
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
        
        new_user = User(
            email=email,
            hashed_password=hashed_password,
            full_name="사용자",
            subscription_tier=SubscriptionTier.FREE,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"[OK] 사용자 생성 완료!")
        print(f"   이메일: {email}")
        print(f"   비밀번호: {password}")
        print(f"   사용자 ID: {new_user.id}")
        print(f"   구독 등급: {new_user.subscription_tier}")
        print(f"\n[WARNING] 보안을 위해 로그인 후 비밀번호를 변경하세요!")
        
        return new_user
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] 사용자 생성 실패: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_user()

