"""
Database Configuration
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# 데이터베이스 연결을 지연 로딩하도록 설정
# connect_args={"check_same_thread": False}는 SQLite용이므로 PostgreSQL에서는 제거
try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,  # 연결이 끊어졌는지 확인
        echo=False
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("✅ 데이터베이스 엔진 초기화 완료")
except Exception as e:
    logger.warning(f"⚠️ 데이터베이스 엔진 초기화 실패: {e}")
    logger.warning("데이터베이스가 필요하지 않은 경우 이 경고는 무시해도 됩니다.")
    engine = None
    SessionLocal = None

Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    if SessionLocal is None:
        # 데이터베이스 엔진이 아예 초기화되지 못한 경우
        raise Exception("데이터베이스가 초기화되지 않았습니다. PostgreSQL 서버가 실행 중인지 확인하세요.")

    try:
        db = SessionLocal()
    except OperationalError as e:
        # 연결 거부 등 운영 오류를 사용자 친화적으로 반환
        logger.error(f"데이터베이스 연결 실패: {e}")
        raise Exception("데이터베이스에 연결할 수 없습니다. PostgreSQL 서버가 실행 중인지 확인하세요.")
    except Exception as e:
        logger.error(f"데이터베이스 세션 생성 실패: {e}")
        raise

    try:
        yield db
    finally:
        db.close()

