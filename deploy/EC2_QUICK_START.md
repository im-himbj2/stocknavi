# EC2 빠른 시작 가이드

이 가이드는 EC2 인스턴스에 StockNavi를 빠르게 배포하는 방법을 설명합니다.

## 사전 준비

1. ✅ EC2 인스턴스 생성 완료
2. ✅ SSH 접속 가능
3. ✅ Node.js 20, Python 3.11 설치 완료

## 1단계: EC2 접속 및 프로젝트 클론

```bash
# SSH 접속
ssh -i "C:\Users\USER\Downloads\stocknavi.pem" ec2-user@YOUR_EC2_IP

# 프로젝트 클론
cd ~
git clone https://github.com/im-himbj2/stocknavi.git
cd stocknavi
```

## 2단계: 환경 변수 설정 (자동)

```bash
# 환경 변수 설정 스크립트 실행
chmod +x deploy/ec2_env_setup.sh
./deploy/ec2_env_setup.sh
```

스크립트가 대화형으로 필요한 정보를 물어봅니다. 입력하시면 됩니다.

## 3단계: 배포 실행

```bash
# 빠른 배포 스크립트 실행
chmod +x deploy/ec2_quick_start.sh
./deploy/ec2_quick_start.sh
```

## 수동 설정 방법

자동 스크립트를 사용하지 않으려면:

### 백엔드 환경 변수

```bash
cd ~/stocknavi/backend
nano .env
```

다음 내용 입력:

```env
DATABASE_URL=postgresql://stockuser:stockpass@localhost:5432/stock_portfolio
SECRET_KEY=your-very-secure-secret-key-here
FMP_API_KEY=your_fmp_api_key
FRED_API_KEY=your_fred_api_key
OPENAI_API_KEY=your_openai_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=ap-northeast-2
AWS_SES_FROM_EMAIL=your_verified_email@example.com
FRONTEND_URL=http://YOUR_EC2_IP:5173
ENVIRONMENT=production
```

### 프론트엔드 환경 변수

```bash
cd ~/stocknavi/frontend
nano .env
```

다음 내용 입력:

```env
VITE_API_BASE_URL=http://YOUR_EC2_IP:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## 4단계: 수동 배포

### 백엔드

```bash
cd ~/stocknavi/backend

# 가상환경 생성 및 활성화
python3.11 -m venv venv
source venv/bin/activate

# 의존성 설치
pip install --upgrade pip
pip install -r requirements.txt

# 데이터베이스 마이그레이션
alembic upgrade head

# PM2로 백엔드 시작
pm2 start uvicorn --name stocknavi-backend -- app.main:app --host 0.0.0.0 --port 8000
```

### 프론트엔드

```bash
cd ~/stocknavi/frontend

# 의존성 설치
npm install

# 빌드
npm run build

# PM2로 프론트엔드 시작
pm2 serve dist --name stocknavi-frontend --spa --port 5173
```

### PM2 자동 시작 설정

```bash
# 현재 설정 저장
pm2 save

# 자동 시작 설정 (출력된 명령어 실행)
pm2 startup
```

## 5단계: 접속 확인

브라우저에서:
- 프론트엔드: `http://YOUR_EC2_IP:5173`
- 백엔드 API 문서: `http://YOUR_EC2_IP:8000/docs`

## 프로세스 관리

```bash
# 프로세스 목록
pm2 list

# 로그 확인
pm2 logs

# 재시작
pm2 restart all

# 중지
pm2 stop all

# 시작
pm2 start all
```

## 업데이트 방법

```bash
cd ~/stocknavi

# 최신 코드 가져오기
git pull origin main

# 빠른 배포 스크립트 재실행
./deploy/ec2_quick_start.sh
```

## 문제 해결

### 포트 접속 불가
- EC2 보안 그룹에서 포트 8000, 5173이 열려있는지 확인

### 데이터베이스 연결 오류
- PostgreSQL이 실행 중인지 확인: `sudo systemctl status postgresql`
- DATABASE_URL이 올바른지 확인

### 빌드 오류
- Node.js 버전 확인: `node --version` (v20 이상)
- npm 캐시 정리: `npm cache clean --force`

### PM2 프로세스 오류
- 로그 확인: `pm2 logs stocknavi-backend` 또는 `pm2 logs stocknavi-frontend`
- 프로세스 재시작: `pm2 restart all`

## 다음 단계

- [ ] Nginx 리버스 프록시 설정 (선택사항)
- [ ] HTTPS 인증서 설정 (Let's Encrypt)
- [ ] 도메인 연결
- [ ] 모니터링 설정


