# 프로덕션 환경 변수 설정 가이드

이 문서는 stocknavi24.com 프로덕션 환경에서 필요한 환경 변수 설정을 설명합니다.

## 현재 배포 정보

- **도메인**: stocknavi24.com
- **IPv4 주소**: 13.209.70.3
- **데이터베이스**: Supabase (권장) 또는 EC2 PostgreSQL

## 백엔드 환경 변수 (.env)

EC2 서버에서 `~/stocknavi/backend/.env` 파일:

```env
# ============================================
# 데이터베이스 설정
# ============================================
# Supabase 사용 시 (권장)
DATABASE_URL=postgresql://postgres:[YOUR-SUPABASE-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# 또는 EC2 로컬 PostgreSQL 사용 시
# DATABASE_URL=postgresql://stockuser:stockpass@localhost:5432/stock_portfolio

# ============================================
# JWT 설정
# ============================================
SECRET_KEY=your-very-secure-secret-key-change-this-in-production-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ============================================
# API Keys
# ============================================
FMP_API_KEY=your_fmp_api_key_here
FRED_API_KEY=your_fred_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# ============================================
# Google OAuth
# ============================================
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ============================================
# Frontend URL
# ============================================
FRONTEND_URL=https://stocknavi24.com

# ============================================
# Supabase (선택사항 - Supabase 사용 시)
# ============================================
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# ============================================
# 환경 설정
# ============================================
ENVIRONMENT=production

# ============================================
# Redis (선택사항)
# ============================================
REDIS_URL=redis://localhost:6379/0
```

## 프론트엔드 환경 변수 (.env)

EC2 서버에서 `~/stocknavi/frontend/.env` 파일:

```env
# ============================================
# API Base URL
# ============================================
VITE_API_BASE_URL=https://stocknavi24.com/api

# ============================================
# Google OAuth Client ID
# ============================================
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## 환경 변수 설정 방법

### 1. 백엔드 환경 변수 설정

```bash
# EC2 서버에 SSH 접속
ssh -i "your-key.pem" ec2-user@13.209.70.3

# 백엔드 디렉토리로 이동
cd ~/stocknavi/backend

# .env 파일 편집
nano .env

# 위의 내용을 복사하여 붙여넣고 실제 값으로 변경
# Ctrl + X, Y, Enter로 저장
```

### 2. 프론트엔드 환경 변수 설정

```bash
# 프론트엔드 디렉토리로 이동
cd ~/stocknavi/frontend

# .env 파일 편집
nano .env

# 위의 내용을 복사하여 붙여넣고 실제 값으로 변경
# Ctrl + X, Y, Enter로 저장
```

### 3. 환경 변수 확인

```bash
# 백엔드 환경 변수 확인
cd ~/stocknavi/backend
cat .env

# 프론트엔드 환경 변수 확인
cd ~/stocknavi/frontend
cat .env
```

## 중요 보안 사항

### 1. SECRET_KEY 생성

강력한 SECRET_KEY 생성:

```bash
# Python으로 랜덤 키 생성
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# 또는 OpenSSL 사용
openssl rand -hex 32
```

### 2. .env 파일 권한 설정

```bash
# .env 파일은 소유자만 읽을 수 있도록 설정
chmod 600 ~/stocknavi/backend/.env
chmod 600 ~/stocknavi/frontend/.env
```

### 3. Git에 .env 파일 커밋하지 않기

`.gitignore` 파일에 `.env`가 포함되어 있는지 확인:

```bash
# .gitignore 확인
cat .gitignore | grep .env
```

## 서비스 재시작

환경 변수를 변경한 후 서비스를 재시작:

```bash
# PM2로 실행 중인 경우
pm2 restart stocknavi-backend
pm2 restart stocknavi-frontend

# 또는 전체 재시작
pm2 restart all

# 로그 확인
pm2 logs
```

## Google OAuth 설정 확인

Google OAuth가 제대로 작동하려면:

1. Google Cloud Console에서 JavaScript 출처 등록 확인
2. `deploy/GOOGLE_OAUTH_SETUP.md` 참조

## Supabase 설정 확인

Supabase를 사용하는 경우:

1. Supabase 대시보드에서 연결 문자열 확인
2. `deploy/SUPABASE_SETUP.md` 참조

## 문제 해결

### 환경 변수가 적용되지 않는 경우

1. **서비스 재시작 확인**: PM2 재시작 후에도 문제가 있으면 서버 재부팅
2. **파일 경로 확인**: `.env` 파일이 올바른 위치에 있는지 확인
3. **문법 오류 확인**: `.env` 파일에 따옴표나 특수문자 오류가 없는지 확인

### 연결 오류

1. **데이터베이스 연결**: Supabase 연결 문자열이 올바른지 확인
2. **API 키 확인**: 모든 API 키가 유효한지 확인
3. **네트워크 확인**: EC2에서 외부 서비스로의 연결 확인

## 참고 문서

- [Google OAuth 설정](./GOOGLE_OAUTH_SETUP.md)
- [Supabase 설정](./SUPABASE_SETUP.md)
- [EC2 배포 가이드](./EC2_DEPLOYMENT_GUIDE.md)


