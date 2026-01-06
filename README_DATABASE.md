# 데이터베이스 시작 가이드

## 문제: PostgreSQL 연결 실패

백엔드가 시작되지 않는 이유는 PostgreSQL 데이터베이스가 실행되지 않기 때문입니다.

## 해결 방법

### 방법 1: Docker Desktop 사용 (권장)

1. **Docker Desktop 설치 및 실행**
   - https://www.docker.com/products/docker-desktop/ 에서 다운로드
   - 설치 후 Docker Desktop 실행

2. **데이터베이스 시작**
   ```bash
   cd deploy
   docker-compose up -d db
   ```

3. **상태 확인**
   ```bash
   docker ps
   # postgres 컨테이너가 실행 중이어야 합니다
   ```

### 방법 2: PostgreSQL 직접 설치

1. **PostgreSQL 다운로드 및 설치**
   - https://www.postgresql.org/download/windows/
   - 설치 시 포트 5432 사용 (기본값)
   - 사용자: stockuser, 비밀번호: stockpass, 데이터베이스: stock_portfolio

2. **서비스 시작**
   - Windows 서비스 관리자에서 "postgresql-x64-XX" 서비스 시작
   - 또는 명령 프롬프트(관리자 권한):
     ```cmd
     net start postgresql-x64-15
     ```
     (버전에 따라 숫자가 다를 수 있습니다)

3. **데이터베이스 및 사용자 생성**
   ```sql
   CREATE USER stockuser WITH PASSWORD 'stockpass';
   CREATE DATABASE stock_portfolio OWNER stockuser;
   GRANT ALL PRIVILEGES ON DATABASE stock_portfolio TO stockuser;
   ```

### 방법 3: 백엔드 시작 스크립트 사용

```bash
cd backend
start_db.bat  # 데이터베이스 시작 안내 확인
start_local.bat  # 백엔드 시작
```

## 확인 방법

데이터베이스가 실행 중인지 확인:
```bash
netstat -ano | findstr :5432
```

포트 5432에서 LISTENING 상태여야 합니다.

## 프론트엔드 하얀 화면 문제

프론트엔드가 하얀 화면으로 표시되는 경우:

1. **브라우저 개발자 도구 확인 (F12)**
   - Console 탭에서 에러 메시지 확인
   - Network 탭에서 API 요청 실패 확인

2. **백엔드가 실행 중인지 확인**
   ```bash
   netstat -ano | findstr :8000
   ```

3. **백엔드 로그 확인**
   - 백엔드 터미널에서 에러 메시지 확인

## 문제 해결 순서

1. ✅ Docker Desktop 실행 또는 PostgreSQL 설치
2. ✅ 데이터베이스 시작
3. ✅ 백엔드 시작 (start_local.bat)
4. ✅ 프론트엔드 시작 (npm run dev)
5. ✅ 브라우저에서 http://localhost:5173 접속













