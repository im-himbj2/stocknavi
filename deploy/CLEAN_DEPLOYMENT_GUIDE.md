# 깔끔한 재배포 가이드

EC2를 완전히 정리하고 로컬에서 모든 설정을 완료한 후 한 번에 배포하는 방법입니다.

## 1단계: EC2 서버 정리

EC2 서버에 SSH 접속 후:

```bash
# 1. PM2 프로세스 모두 중지 및 삭제
pm2 delete all
pm2 kill

# 2. 프로젝트 폴더 삭제 (선택사항 - 완전히 정리하려면)
cd ~
rm -rf stocknavi

# 또는 백업 후 삭제
mv stocknavi stocknavi_backup_$(date +%Y%m%d)
```

## 2단계: 로컬에서 모든 설정 완료

### 2-1. 백엔드 환경 변수 설정

`backend/.env` 파일 확인/수정:

```env
# ============================================
# 데이터베이스 설정
# ============================================
# Supabase 사용 시
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
# Google OAuth (중요!)
# ============================================
GOOGLE_CLIENT_ID=746675422451-s6bu7cdheovj2fmdbetg9er70adg2mat.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ============================================
# Frontend URL
# ============================================
FRONTEND_URL=https://stocknavi24.com

# ============================================
# 환경 설정
# ============================================
ENVIRONMENT=production
```

### 2-2. 프론트엔드 환경 변수 설정

`frontend/.env` 파일 확인/수정:

```env
# API Base URL
VITE_API_BASE_URL=https://stocknavi24.com/api

# Google OAuth Client ID (백엔드와 동일해야 함!)
VITE_GOOGLE_CLIENT_ID=746675422451-s6bu7cdheovj2fmdbetg9er70adg2mat.apps.googleusercontent.com
```

**중요:** `VITE_GOOGLE_CLIENT_ID`와 백엔드의 `GOOGLE_CLIENT_ID`가 **정확히 동일**해야 합니다!

### 2-3. Google Cloud Console 설정 확인

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **API 및 서비스** > **사용자 인증 정보**
3. OAuth 2.0 클라이언트 ID 클릭
4. **승인된 JavaScript 출처**에 다음 추가:
   ```
   https://stocknavi24.com
   http://stocknavi24.com
   https://www.stocknavi24.com
   http://www.stocknavi24.com
   http://13.209.70.3
   https://13.209.70.3
   ```
5. **저장** 클릭

### 2-4. 코드 확인

로컬에서 모든 코드가 정상 작동하는지 확인:

```powershell
# 백엔드 테스트
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
# 환경 변수 설정 후 테스트 실행 가능하면 좋음

# 프론트엔드 테스트
cd frontend
npm install
npm run build
```

## 3단계: Git에 커밋 (선택사항)

로컬 변경사항을 Git에 커밋:

```powershell
# .env 파일은 .gitignore에 있어야 함 (커밋하지 않음)
git add .
git commit -m "프로덕션 배포 준비 완료"
git push origin main
```

## 4단계: EC2 서버에 한 번에 배포

### 4-1. EC2 서버 접속 및 초기 설정

```bash
# EC2 서버에 SSH 접속
ssh -i "your-key.pem" ec2-user@13.209.70.3

# 시스템 업데이트
sudo yum update -y

# 필수 패키지 설치
sudo yum install -y git python3.11 python3.11-pip nodejs npm

# PM2 설치
sudo npm install -g pm2
```

### 4-2. 프로젝트 클론

```bash
cd ~
git clone https://github.com/your-username/stocknavi.git
# 또는 기존 저장소 URL 사용

cd stocknavi
```

### 4-3. 백엔드 설정

```bash
cd ~/stocknavi/backend

# .env 파일 생성
nano .env
# 로컬의 backend/.env 내용을 그대로 복사하여 붙여넣기

# 가상환경 생성
python3.11 -m venv venv
source venv/bin/activate

# 의존성 설치
pip install --upgrade pip
pip install -r requirements.txt

# 데이터베이스 마이그레이션
alembic upgrade head
```

### 4-4. 프론트엔드 설정

```bash
cd ~/stocknavi/frontend

# .env 파일 생성
nano .env
# 로컬의 frontend/.env 내용을 그대로 복사하여 붙여넣기

# 의존성 설치
npm install

# 빌드
npm run build
```

### 4-5. PM2로 서비스 시작

```bash
# 백엔드 시작
cd ~/stocknavi/backend
source venv/bin/activate
pm2 start venv/bin/uvicorn --name stocknavi-backend --interpreter venv/bin/python -- app.main:app --host 0.0.0.0 --port 8000

# 프론트엔드 시작
cd ~/stocknavi/frontend
pm2 serve dist --name stocknavi-frontend --spa --port 5173

# PM2 저장 및 자동 시작 설정
pm2 save
pm2 startup
# 출력된 명령어를 복사해서 실행
```

### 4-6. Nginx 설정 (도메인 사용 시)

```bash
# Nginx 설치
sudo yum install -y nginx

# 설정 파일 생성
sudo nano /etc/nginx/conf.d/stocknavi.conf
```

다음 내용 입력:

```nginx
server {
    listen 80;
    server_name stocknavi24.com www.stocknavi24.com 13.209.70.3;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Documentation
    location /docs {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
}
```

```bash
# Nginx 시작 및 자동 시작 설정
sudo systemctl start nginx
sudo systemctl enable nginx

# 설정 테스트
sudo nginx -t

# 재시작
sudo systemctl restart nginx
```

## 5단계: 확인

```bash
# PM2 상태 확인
pm2 list

# 로그 확인
pm2 logs

# 백엔드 테스트
curl http://localhost:8000/docs

# 프론트엔드 테스트
curl http://localhost:5173
```

브라우저에서:
- `https://stocknavi24.com` 접속
- `https://stocknavi24.com/login` 접속하여 Google 로그인 테스트

## 자동 배포 스크립트 사용 (선택사항)

더 편하게 하려면 배포 스크립트를 사용할 수 있습니다:

```bash
cd ~/stocknavi
chmod +x deploy/ec2_setup.sh
./deploy/ec2_setup.sh
```

하지만 이 경우 `.env` 파일은 수동으로 설정해야 합니다.

## 문제 해결

### 환경 변수가 적용되지 않는 경우

```bash
# PM2 재시작
pm2 restart all

# 또는 완전히 재시작
pm2 delete all
# 위의 4-5단계 다시 실행
```

### Google OAuth 오류

1. Google Cloud Console에서 JavaScript 출처 확인
2. 백엔드와 프론트엔드의 Client ID가 동일한지 확인:
   ```bash
   cd ~/stocknavi/backend && cat .env | grep GOOGLE_CLIENT_ID
   cd ~/stocknavi/frontend && cat .env | grep VITE_GOOGLE_CLIENT_ID
   ```

### 데이터베이스 연결 오류

```bash
# Supabase 연결 테스트
cd ~/stocknavi/backend
source venv/bin/activate
python -c "from sqlalchemy import create_engine; import os; from dotenv import load_dotenv; load_dotenv(); engine = create_engine(os.getenv('DATABASE_URL')); conn = engine.connect(); print('✅ 연결 성공!'); conn.close()"
```

## 요약

1. ✅ 로컬에서 모든 설정 완료 (`.env` 파일들)
2. ✅ Google Cloud Console 설정 완료
3. ✅ EC2 서버 정리
4. ✅ 프로젝트 클론
5. ✅ 환경 변수 파일 생성
6. ✅ 의존성 설치 및 빌드
7. ✅ PM2로 서비스 시작
8. ✅ 테스트

이 방법으로 깔끔하게 재배포할 수 있습니다!


