#!/bin/bash

# 빠른 배포 스크립트
# EC2 서버에서 실행: bash deploy/quick_deploy.sh

set -e

echo "🚀 StockNavi 빠른 배포 시작..."

# 현재 디렉토리 확인
if [ ! -f "README.md" ]; then
    echo "❌ 프로젝트 루트 디렉토리에서 실행해주세요."
    exit 1
fi

# 1. 환경 변수 파일 확인
echo "📋 환경 변수 파일 확인 중..."
if [ ! -f "backend/.env" ]; then
    echo "❌ backend/.env 파일이 없습니다!"
    echo "먼저 backend/.env 파일을 생성하세요."
    exit 1
fi

if [ ! -f "frontend/.env" ]; then
    echo "❌ frontend/.env 파일이 없습니다!"
    echo "먼저 frontend/.env 파일을 생성하세요."
    exit 1
fi

# 2. PM2 설치 확인
if ! command -v pm2 &> /dev/null; then
    echo "📦 PM2 설치 중..."
    sudo npm install -g pm2
fi

# 3. 기존 프로세스 정리
echo "🧹 기존 프로세스 정리 중..."
pm2 delete all 2>/dev/null || true

# 4. 백엔드 설정
echo "🔧 백엔드 설정 중..."
cd backend

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
alembic upgrade head || echo "⚠️  마이그레이션 오류 (무시 가능)"

# 백엔드 시작
echo "🚀 백엔드 시작 중..."
pm2 start venv/bin/uvicorn --name stocknavi-backend --interpreter venv/bin/python -- app.main:app --host 0.0.0.0 --port 8000

cd ..

# 5. 프론트엔드 설정
echo "🔧 프론트엔드 설정 중..."
cd frontend

# 의존성 설치
echo "📦 프론트엔드 의존성 설치 중..."
npm install --silent

# 빌드
echo "🏗️  프론트엔드 빌드 중..."
npm run build

# 프론트엔드 시작
echo "🚀 프론트엔드 시작 중..."
pm2 serve dist --name stocknavi-frontend --spa --port 5173

cd ..

# 6. PM2 저장 및 자동 시작 설정
echo "💾 PM2 설정 저장 중..."
pm2 save

echo "✅ 배포 완료!"
echo ""
echo "📊 실행 중인 프로세스:"
pm2 list
echo ""
echo "📝 로그 확인: pm2 logs"
echo "🔄 재시작: pm2 restart all"
echo "🛑 중지: pm2 stop all"

