# 로컬 개발 환경 설정 가이드 (Docker 없이)

## 사전 요구사항

### 필수
1. **Python 3.11 이상**
   - [Python 다운로드](https://www.python.org/downloads/)
   - 설치 시 "Add Python to PATH" 체크

2. **Node.js 18 이상**
   - [Node.js 다운로드](https://nodejs.org/)

3. **PostgreSQL** (선택: Supabase 무료 티어 사용 가능)
   - [PostgreSQL 다운로드](https://www.postgresql.org/download/)
   - 또는 [Supabase](https://supabase.com/) 무료 계정 생성

### 선택사항
4. **Redis** (없어도 됨 - 인메모리 캐싱으로 대체)
   - [Redis 다운로드](https://redis.io/download)
   - 또는 Railway/Render에서 무료 Redis 제공

## 빠른 시작

### 1. 데이터베이스 설정

#### 옵션 A: Supabase 사용 (추천 - 무료, 간단)
1. [Supabase](https://supabase.com/)에서 계정 생성
2. 새 프로젝트 생성
3. Settings > Database에서 연결 문자열 복사
4. `backend/.env` 파일에 `DATABASE_URL` 설정

#### 옵션 B: 로컬 PostgreSQL
1. PostgreSQL 설치
2. 데이터베이스 생성:
   ```sql
   CREATE DATABASE stock_portfolio;
   ```
3. `backend/.env` 파일에 설정:
   ```
   DATABASE_URL=postgresql://사용자명:비밀번호@localhost:5432/stock_portfolio
   ```

### 2. 백엔드 설정

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
copy .env.example .env
# .env 파일을 편집하여 DATABASE_URL 등 설정

# 데이터베이스 마이그레이션
alembic upgrade head

# 서버 실행
uvicorn app.main:app --reload
```

또는 Windows에서:
```bash
start_local.bat
```

### 3. 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

또는 Windows에서:
```bash
start_local.bat
```

## 환경 변수 설정 (.env)

`backend/.env` 파일 예시:

```env
# 데이터베이스 (Supabase 사용 시)
DATABASE_URL=postgresql://postgres:비밀번호@db.xxxxx.supabase.co:5432/postgres

# JWT (랜덤 문자열 생성)
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis (선택사항 - 없으면 인메모리 캐싱 사용)
REDIS_URL=redis://localhost:6379/0

# API Keys (선택사항)
ALPHA_VANTAGE_API_KEY=your-key-here
FRED_API_KEY=your-key-here

# AI Services (선택사항)
OPENAI_API_KEY=your-key-here
OLLAMA_BASE_URL=http://localhost:11434

# Google OAuth (구글 로그인)
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Environment
ENVIRONMENT=development
```

`frontend/.env` 파일 예시:

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:8000/api

# Google OAuth Client ID (구글 로그인)
# Google Cloud Console에서 OAuth 2.0 Client ID 생성 필요
# https://console.cloud.google.com/apis/credentials
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

## 문제 해결

### PostgreSQL 연결 오류
- Supabase 사용 시: 연결 문자열이 올바른지 확인
- 로컬 PostgreSQL: 서비스가 실행 중인지 확인

### Redis 연결 오류
- Redis가 없어도 됩니다! 인메모리 캐싱으로 자동 폴백됩니다.

### 포트 충돌
- 백엔드: 기본 포트 8000, 변경하려면 `uvicorn app.main:app --port 8001`
- 프론트엔드: 기본 포트 5173, 변경하려면 `vite.config.js` 수정

## 다음 단계

1. 브라우저에서 `http://localhost:5173` 접속
2. API 문서 확인: `http://localhost:8000/docs`
3. 개발 시작!

