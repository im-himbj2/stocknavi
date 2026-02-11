# Supabase 데이터베이스 전환 가이드

이 가이드는 Amazon EC2의 PostgreSQL 대신 Supabase를 사용하도록 설정하는 방법을 설명합니다.

## Supabase 장점

- 무료 티어 제공 (500MB 데이터베이스, 2GB 대역폭)
- 자동 백업 및 복구
- 실시간 기능
- 관리형 PostgreSQL
- 자동 스케일링

## 1단계: Supabase 프로젝트 생성

1. [Supabase](https://supabase.com/) 접속 및 회원가입
2. **New Project** 클릭
3. 프로젝트 정보 입력:
   - **Name**: stocknavi (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 생성 (저장해두세요!)
   - **Region**: 가장 가까운 리전 선택 (예: Northeast Asia (Seoul))
4. **Create new project** 클릭
5. 프로젝트 생성 완료까지 1-2분 대기

## 2단계: 데이터베이스 연결 정보 확인

1. Supabase 대시보드에서 **Settings** > **Database** 이동
2. **Connection string** 섹션에서 **URI** 선택
3. 연결 문자열 복사 (형식: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)

## 3단계: 환경 변수 업데이트

EC2 서버에 SSH 접속 후:

```bash
cd ~/stocknavi/backend
nano .env
```

다음 내용을 업데이트:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# 기존 설정 유지
SECRET_KEY=your-very-secure-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Keys
FMP_API_KEY=your_fmp_api_key_here
FRED_API_KEY=your_fred_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Frontend URL
FRONTEND_URL=https://stocknavi24.com

# Environment
ENVIRONMENT=production
```

**중요:** `[YOUR-PASSWORD]`를 실제 Supabase 데이터베이스 비밀번호로 교체하세요.

## 4단계: 데이터베이스 마이그레이션

Supabase는 PostgreSQL이므로 기존 마이그레이션을 그대로 사용할 수 있습니다:

```bash
cd ~/stocknavi/backend
source venv/bin/activate

# 마이그레이션 실행
alembic upgrade head
```

## 5단계: 연결 테스트

```bash
# Python으로 연결 테스트
python3 -c "
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))
conn = engine.connect()
print('✅ Supabase 연결 성공!')
conn.close()
"
```

## 6단계: 백엔드 재시작

```bash
# PM2로 실행 중인 경우
pm2 restart stocknavi-backend

# 또는 수동 실행 테스트
cd ~/stocknavi/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 7단계: 확인

1. 브라우저에서 `https://stocknavi24.com/api/docs` 접속
2. API 문서가 정상적으로 표시되는지 확인
3. 로그인/회원가입 기능 테스트

## 문제 해결

### 연결 오류가 발생하는 경우

1. **비밀번호 확인**: 연결 문자열의 비밀번호가 올바른지 확인
2. **네트워크 확인**: EC2 인스턴스에서 Supabase로의 네트워크 연결 확인
   ```bash
   # 연결 테스트
   telnet db.xxxxx.supabase.co 5432
   ```
3. **방화벽 확인**: Supabase는 공개적으로 접근 가능하므로 EC2 방화벽 설정 확인

### 마이그레이션 오류

1. **기존 테이블 확인**: Supabase 대시보드에서 **Table Editor** 확인
2. **마이그레이션 롤백** (필요한 경우):
   ```bash
   alembic downgrade -1
   ```

### 성능 이슈

- Supabase 무료 티어는 제한이 있으므로 프로덕션 환경에서는 유료 플랜 고려
- 연결 풀링 설정 확인 (`pool_pre_ping=True`는 이미 설정되어 있음)

## Supabase 추가 기능 활용 (선택사항)

### 1. Row Level Security (RLS)

Supabase는 자동으로 Row Level Security를 제공합니다. 필요시 설정:

1. Supabase 대시보드 > **Authentication** > **Policies**
2. 테이블별 보안 정책 설정

### 2. 실시간 기능

Supabase의 실시간 기능을 활용하려면:

```python
# backend/app/core/database.py에 추가 가능
from supabase import create_client, Client

supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_ANON_KEY
)
```

### 3. Storage (파일 저장)

이미지나 파일을 저장해야 하는 경우 Supabase Storage 사용 가능

## 기존 EC2 PostgreSQL 데이터 마이그레이션 (선택사항)

기존 데이터를 Supabase로 이전하려면:

```bash
# EC2에서 기존 데이터 덤프
pg_dump -h localhost -U stockuser -d stock_portfolio > backup.sql

# Supabase로 복원
psql "postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres" < backup.sql
```

## 참고사항

- Supabase 무료 티어 제한:
  - 데이터베이스: 500MB
  - 대역폭: 2GB/월
  - 파일 저장: 1GB
  - 동시 연결: 60개

- 프로덕션 환경에서는 유료 플랜을 고려하세요
- Supabase는 자동 백업을 제공하므로 별도 백업 설정이 필요 없습니다

