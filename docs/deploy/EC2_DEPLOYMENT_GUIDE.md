# EC2 배포 가이드

이 가이드는 Amazon Linux 2 EC2 인스턴스에 StockNavi를 배포하는 방법을 설명합니다.

## 사전 준비

1. **EC2 인스턴스 생성 완료**
   - Amazon Linux 2 AMI
   - t2.micro 또는 t3.micro (무료 티어)
   - 보안 그룹 설정:
     - SSH (22) - 본인 IP
     - HTTP (80) - 모든 IP
     - HTTPS (443) - 모든 IP
     - Custom TCP (8000) - 모든 IP (백엔드)
     - Custom TCP (5173) - 모든 IP (프론트엔드)

2. **SSH 키 페어 다운로드 완료**

3. **GitHub 저장소 준비 완료**

## 1단계: EC2 인스턴스 접속

PowerShell에서:

```powershell
# 키 파일 권한 설정 (첫 접속 시)
icacls "C:\Users\USER\Downloads\stocknavi.pem" /grant:r "$($env:USERNAME):(R)"

# SSH 접속
ssh -i "C:\Users\USER\Downloads\stocknavi.pem" ec2-user@YOUR_EC2_PUBLIC_IP
```

## 2단계: 초기 설정

EC2 인스턴스에 접속한 후:

```bash
# 시스템 업데이트
sudo yum update -y

# Node.js 20 설치
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Python 3.11 설치
sudo yum install -y python3.11 python3.11-pip

# Git 설치 (이미 설치되어 있을 수 있음)
sudo yum install -y git

# PostgreSQL 클라이언트 설치 (선택사항)
sudo yum install -y postgresql15
```

## 3단계: 프로젝트 클론

```bash
# 홈 디렉토리로 이동
cd ~

# 프로젝트 클론
git clone https://github.com/im-himbj2/stocknavi.git

# 프로젝트 폴더로 이동
cd stocknavi
```

## 4단계: 환경 변수 설정

### 백엔드 환경 변수

```bash
cd ~/stocknavi/backend

# .env 파일 생성
nano .env
```

다음 내용을 입력하세요 (실제 값으로 변경):

```env
# Database (Supabase 사용 시)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
# 또는 로컬 PostgreSQL 사용 시
# DATABASE_URL=postgresql://stockuser:stockpass@localhost:5432/stock_portfolio

# JWT
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

# AWS SES (이메일 인증) - 선택사항
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=ap-northeast-2
AWS_SES_FROM_EMAIL=your_verified_email@example.com

# Frontend URL (도메인 사용 시)
FRONTEND_URL=https://stocknavi24.com
# 또는 IP 주소 사용 시
# FRONTEND_URL=http://13.209.70.3

# Environment
ENVIRONMENT=production
```

`Ctrl + X`, `Y`, `Enter`로 저장하고 종료

### 프론트엔드 환경 변수

```bash
cd ~/stocknavi/frontend

# .env 파일 생성
nano .env
```

다음 내용을 입력하세요 (실제 값으로 변경):

```env
# API Base URL (도메인 사용 시)
VITE_API_BASE_URL=https://stocknavi24.com/api
# 또는 IP 주소 사용 시
# VITE_API_BASE_URL=http://13.209.70.3:8000/api

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

`Ctrl + X`, `Y`, `Enter`로 저장하고 종료

## 5단계: 자동 배포 스크립트 실행

```bash
cd ~/stocknavi

# 배포 스크립트 다운로드 (이미 클론되어 있으면 생략)
# 또는 직접 실행
chmod +x deploy/ec2_setup.sh
./deploy/ec2_setup.sh
```

## 6단계: 수동 배포 (스크립트 사용 안 할 경우)

### 백엔드 설정

```bash
cd ~/stocknavi/backend

# Python 가상환경 생성
python3.11 -m venv venv
source venv/bin/activate

# 의존성 설치
pip install --upgrade pip
pip install -r requirements.txt

# 데이터베이스 마이그레이션
alembic upgrade head
```

### 프론트엔드 설정

```bash
cd ~/stocknavi/frontend

# 의존성 설치
npm install

# 빌드
npm run build
```

### PM2 설치 및 프로세스 관리

```bash
# PM2 설치
sudo npm install -g pm2

# 백엔드 시작
cd ~/stocknavi/backend
source venv/bin/activate
pm2 start uvicorn --name stocknavi-backend -- app.main:app --host 0.0.0.0 --port 8000

# 프론트엔드 시작
cd ~/stocknavi/frontend
pm2 serve dist --name stocknavi-frontend --spa --port 5173

# PM2 저장 및 자동 시작 설정
pm2 save
pm2 startup
# 출력된 명령어를 복사해서 실행
```

## 7단계: 방화벽 설정 확인

EC2 보안 그룹에서 다음 포트가 열려있는지 확인:
- 8000 (백엔드)
- 5173 (프론트엔드)

## 8단계: 접속 확인

브라우저에서:
- 프론트엔드: `https://stocknavi24.com` 또는 `http://13.209.70.3:5173`
- 백엔드 API: `https://stocknavi24.com/api/docs` 또는 `http://13.209.70.3:8000/docs`

## 추가 설정

### Google OAuth 설정
Google OAuth `origin_mismatch` 오류를 해결하려면 `deploy/GOOGLE_OAUTH_SETUP.md` 파일을 참조하세요.

### Supabase 데이터베이스 전환
EC2의 PostgreSQL 대신 Supabase를 사용하려면 `deploy/SUPABASE_SETUP.md` 파일을 참조하세요.

## 유용한 PM2 명령어

```bash
# 프로세스 목록 확인
pm2 list

# 로그 확인
pm2 logs

# 특정 프로세스 로그
pm2 logs stocknavi-backend
pm2 logs stocknavi-frontend

# 프로세스 재시작
pm2 restart all
pm2 restart stocknavi-backend
pm2 restart stocknavi-frontend

# 프로세스 중지
pm2 stop all

# 프로세스 삭제
pm2 delete stocknavi-backend
pm2 delete stocknavi-frontend

# 모니터링
pm2 monit
```

## 문제 해결

### 포트가 열리지 않는 경우
- EC2 보안 그룹에서 포트 확인
- 인스턴스 내부 방화벽 확인: `sudo firewall-cmd --list-all`

### 데이터베이스 연결 오류
- PostgreSQL이 실행 중인지 확인
- DATABASE_URL이 올바른지 확인
- 데이터베이스가 생성되어 있는지 확인

### 빌드 오류
- Node.js 버전 확인: `node --version` (v20 이상 권장)
- npm 캐시 정리: `npm cache clean --force`
- node_modules 삭제 후 재설치: `rm -rf node_modules && npm install`

### PM2 프로세스가 시작되지 않는 경우
- 로그 확인: `pm2 logs`
- 수동 실행 테스트: `cd backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000`

## 업데이트 방법

```bash
cd ~/stocknavi
git pull origin main

# 백엔드 재시작
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
pm2 restart stocknavi-backend

# 프론트엔드 재시작
cd ../frontend
npm install
npm run build
pm2 restart stocknavi-frontend
```

## 참고사항

- EC2 인스턴스가 중지되면 Public IP가 변경될 수 있습니다 (Elastic IP 사용 권장)
- 무료 티어는 제한이 있으므로 사용량 모니터링 필요
- 프로덕션 환경에서는 Nginx 리버스 프록시 사용 권장
- HTTPS를 위해서는 Let's Encrypt 인증서 설정 필요



