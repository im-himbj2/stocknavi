#!/bin/bash

# EC2 빠른 시작 스크립트
# 이 스크립트는 환경 변수 설정 후 실행하세요

set -e

echo "🚀 StockNavi 빠른 배포 시작..."

# 현재 디렉토리 확인
if [ ! -f "README.md" ]; then
    echo "❌ 프로젝트 루트 디렉토리에서 실행해주세요."
    exit 1
fi

# 1. PM2 설치 확인
if ! command -v pm2 &> /dev/null; then
    echo "📦 PM2 설치 중..."
    sudo npm install -g pm2
fi

# 2. 백엔드 설정
echo "🔧 백엔드 설정 중..."
cd backend

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo "❌ backend/.env 파일이 없습니다!"
    echo "다음 명령어로 생성하세요:"
    echo "  nano backend/.env"
    exit 1
fi

# 가상환경 확인 및 생성
if [ ! -d "venv" ]; then
    echo "📦 Python 가상환경 생성 중..."
    python3.11 -m venv venv
fi

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치
echo "📦 백엔드 의존성 설치 중..."
pip install --upgrade pip -q
pip install -r requirements.txt -q

# 데이터베이스 마이그레이션
echo "🗄️  데이터베이스 마이그레이션 중..."
alembic upgrade head

# 백엔드 프로세스 재시작
echo "🔄 백엔드 재시작 중..."
pm2 delete stocknavi-backend 2>/dev/null || true
pm2 start uvicorn --name stocknavi-backend -- app.main:app --host 0.0.0.0 --port 8000

cd ..

# 3. 프론트엔드 설정
echo "🔧 프론트엔드 설정 중..."
cd frontend

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo "❌ frontend/.env 파일이 없습니다!"
    echo "다음 명령어로 생성하세요:"
    echo "  nano frontend/.env"
    exit 1
fi

# 의존성 설치
echo "📦 프론트엔드 의존성 설치 중..."
npm install --silent

# 빌드
echo "🏗️  프론트엔드 빌드 중..."
npm run build

# 프론트엔드 프로세스 재시작
echo "🔄 프론트엔드 재시작 중..."
pm2 delete stocknavi-frontend 2>/dev/null || true
pm2 serve dist --name stocknavi-frontend --spa --port 5173

cd ..

# PM2 저장
pm2 save

echo ""
echo "✅ 배포 완료!"
echo ""
echo "📊 실행 중인 프로세스:"
pm2 list
echo ""
echo "🌐 접속 주소:"
echo "  프론트엔드: http://$(curl -s ifconfig.me):5173"
echo "  백엔드 API: http://$(curl -s ifconfig.me):8000/docs"
echo ""
echo "📝 유용한 명령어:"
echo "  pm2 logs          # 로그 확인"
echo "  pm2 restart all   # 모든 프로세스 재시작"
echo "  pm2 stop all      # 모든 프로세스 중지"



