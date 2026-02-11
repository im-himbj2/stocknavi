# 빠른 시작 가이드

## 문제 해결 순서

### 1단계: 데이터베이스 시작

**옵션 A: Docker Desktop 사용 (가장 쉬움)**

1. Docker Desktop 실행
   - Windows 시작 메뉴에서 "Docker Desktop" 실행
   - 시스템 트레이에 Docker 아이콘이 나타날 때까지 대기

2. 데이터베이스 시작
   ```bash
   cd D:\stock-portfolio\deploy
   docker-compose up -d db
   ```

3. 확인
   ```bash
   docker ps
   # postgres 컨테이너가 실행 중이어야 합니다
   ```

**옵션 B: PostgreSQL 직접 설치**

1. PostgreSQL 다운로드
   - https://www.postgresql.org/download/windows/
   - 설치 시 포트 5432 사용

2. 서비스 시작
   - Windows 서비스 관리자 열기 (Win + R → services.msc)
   - "postgresql-x64-XX" 서비스 찾기
   - 우클릭 → 시작

3. 데이터베이스 생성 (pgAdmin 또는 psql 사용)
   ```sql
   CREATE USER stockuser WITH PASSWORD 'stockpass';
   CREATE DATABASE stock_portfolio OWNER stockuser;
   GRANT ALL PRIVILEGES ON DATABASE stock_portfolio TO stockuser;
   ```

### 2단계: 백엔드 시작

```bash
cd D:\stock-portfolio\backend
start_local.bat
```

**데이터베이스가 실행되지 않으면:**
- 백엔드는 시작되지만 마이그레이션은 실패합니다
- 데이터베이스를 먼저 시작한 후 백엔드를 재시작하세요

### 3단계: 프론트엔드 시작

새 터미널에서:
```bash
cd D:\stock-portfolio\frontend
npm run dev
```

### 4단계: 브라우저에서 확인

1. http://localhost:5173 접속
2. F12로 개발자 도구 열기
3. Console 탭에서 에러 확인

## 수정된 사항

✅ 프론트엔드 에러 수정: `createCheckoutSession` → `createPayment`, `confirmPayment`
✅ AuthContext 타임아웃 추가
✅ 전역 에러 핸들러 추가

## 문제 해결

**데이터베이스 연결 실패:**
- Docker Desktop이 실행 중인지 확인
- 또는 PostgreSQL 서비스가 실행 중인지 확인
- `netstat -ano | findstr :5432` 명령어로 포트 확인

**프론트엔드 하얀 화면:**
- 브라우저 개발자 도구(F12) → Console 탭 확인
- 백엔드가 실행 중인지 확인: `netstat -ano | findstr :8000`
- 브라우저 새로고침 (Ctrl + F5)














