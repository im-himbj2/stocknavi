#!/bin/bash

# EC2 배포 스크립트
# Amazon Linux 2용

set -e

echo "🚀 StockNavi EC2 배포 시작..."

# 1. 시스템 업데이트
echo "📦 시스템 패키지 업데이트 중..."
sudo yum update -y

# 2. 필요한 패키지 설치
echo "📦 필수 패키지 설치 중..."
sudo yum install -y git python3.11 python3.11-pip postgresql15

# 3. Node.js 확인 (이미 설치되어 있다고 가정)
echo "📦 Node.js 확인 중..."
if ! command -v node &> /dev/null; then
    echo "Node.js가 설치되어 있지 않습니다. 설치 중..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
fi

node --version
npm --version

# 4. PM2 설치 (프로세스 관리)
echo "📦 PM2 설치 중..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# 5. 프로젝트 클론 또는 업데이트
echo "📦 프로젝트 클론/업데이트 중..."
if [ -d "stocknavi" ]; then
    echo "기존 프로젝트 폴더 발견. 업데이트 중..."
    cd stocknavi
    git pull origin main
else
    echo "프로젝트 클론 중..."
    git clone https://github.com/im-himbj2/stocknavi.git
    cd stocknavi
fi

# 6. 백엔드 설정
echo "🔧 백엔드 설정 중..."
cd backend

# Python 가상환경 생성
if [ ! -d "venv" ]; then
    python3.11 -m venv venv
fi

source venv/bin/activate

# 의존성 설치
pip install --upgrade pip
pip install -r requirements.txt

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo "⚠️  .env 파일이 없습니다. 생성해주세요."
    echo "예시:"
    echo "DATABASE_URL=postgresql://user:password@localhost:5432/stock_portfolio"
    echo "SECRET_KEY=your-secret-key-here"
    echo "FMP_API_KEY=your-fmp-api-key"
    echo "FRONTEND_URL=http://your-ec2-ip:5173"
    exit 1
fi

# 데이터베이스 마이그레이션
echo "🗄️  데이터베이스 마이그레이션 중..."
alembic upgrade head

cd ..

# 7. 프론트엔드 설정
echo "🔧 프론트엔드 설정 중..."
cd frontend

# 의존성 설치
npm install

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo "⚠️  frontend/.env 파일이 없습니다. 생성해주세요."
    echo "예시:"
    echo "VITE_API_BASE_URL=http://your-ec2-ip:8000"
    echo "VITE_GOOGLE_CLIENT_ID=your-google-client-id"
    exit 1
fi

# 빌드
echo "🏗️  프론트엔드 빌드 중..."
npm run build

cd ..

# 8. PM2로 애플리케이션 시작
echo "🚀 애플리케이션 시작 중..."

# 백엔드 시작
cd backend
source venv/bin/activate
pm2 delete stocknavi-backend 2>/dev/null || true
pm2 start uvicorn --name stocknavi-backend -- app.main:app --host 0.0.0.0 --port 8000
cd ..

# 프론트엔드 시작 (빌드된 파일을 서빙)
cd frontend
pm2 delete stocknavi-frontend 2>/dev/null || true
pm2 serve dist --name stocknavi-frontend --spa --port 5173
cd ..

# PM2 저장 및 자동 시작 설정
pm2 save
pm2 startup

echo "✅ 배포 완료!"
echo ""
echo "📊 실행 중인 프로세스 확인: pm2 list"
echo "📝 로그 확인: pm2 logs"
echo "🛑 중지: pm2 stop all"
echo "▶️  시작: pm2 start all"
echo "🔄 재시작: pm2 restart all"




