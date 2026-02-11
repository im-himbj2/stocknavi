#!/bin/bash

# 배포 스크립트
set -e

echo "🚀 배포 시작..."

# 환경 변수 확인
if [ ! -f .env.production ]; then
    echo "❌ .env.production 파일이 없습니다."
    exit 1
fi

# Docker 이미지 빌드
echo "📦 Docker 이미지 빌드 중..."
docker-compose -f deploy/docker-compose.yml build

# 기존 컨테이너 중지
echo "🛑 기존 컨테이너 중지 중..."
docker-compose -f deploy/docker-compose.yml down

# 새 컨테이너 시작
echo "▶️  새 컨테이너 시작 중..."
docker-compose -f deploy/docker-compose.yml up -d

# 데이터베이스 마이그레이션
echo "🗄️  데이터베이스 마이그레이션 중..."
docker-compose -f deploy/docker-compose.yml exec backend alembic upgrade head

echo "✅ 배포 완료!"




















