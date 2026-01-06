#!/bin/bash

# EC2 환경 변수 설정 도우미 스크립트
# 이 스크립트는 환경 변수를 대화형으로 설정합니다

set -e

echo "🔧 StockNavi 환경 변수 설정"
echo "================================"
echo ""

# EC2 Public IP 자동 감지
EC2_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_EC2_IP")
echo "감지된 EC2 IP: $EC2_IP"
echo ""

# 백엔드 .env 파일 생성
echo "📝 백엔드 환경 변수 설정"
echo "------------------------"

read -p "데이터베이스 URL (기본: postgresql://stockuser:stockpass@localhost:5432/stock_portfolio): " DB_URL
DB_URL=${DB_URL:-postgresql://stockuser:stockpass@localhost:5432/stock_portfolio}

read -p "SECRET_KEY (JWT 토큰용, 강력한 랜덤 문자열 권장): " SECRET_KEY
if [ -z "$SECRET_KEY" ]; then
    SECRET_KEY=$(openssl rand -hex 32)
    echo "자동 생성된 SECRET_KEY: $SECRET_KEY"
fi

read -p "FMP_API_KEY: " FMP_KEY
read -p "FRED_API_KEY (선택사항): " FRED_KEY
read -p "OPENAI_API_KEY (선택사항): " OPENAI_KEY
read -p "GOOGLE_CLIENT_ID (선택사항): " GOOGLE_CLIENT_ID
read -p "GOOGLE_CLIENT_SECRET (선택사항): " GOOGLE_CLIENT_SECRET
read -p "AWS_ACCESS_KEY_ID (이메일 인증용, 선택사항): " AWS_ACCESS_KEY
read -p "AWS_SECRET_ACCESS_KEY (선택사항): " AWS_SECRET_KEY
read -p "AWS_SES_FROM_EMAIL (인증된 이메일, 선택사항): " AWS_SES_EMAIL

# 백엔드 .env 파일 생성
cat > backend/.env << EOF
# Database
DATABASE_URL=$DB_URL

# JWT
SECRET_KEY=$SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Keys
FMP_API_KEY=$FMP_KEY
FRED_API_KEY=$FRED_KEY
OPENAI_API_KEY=$OPENAI_KEY

# Google OAuth
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET

# AWS SES (이메일 인증)
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_KEY
AWS_REGION=ap-northeast-2
AWS_SES_FROM_EMAIL=$AWS_SES_EMAIL

# Frontend URL
FRONTEND_URL=http://$EC2_IP:5173

# Environment
ENVIRONMENT=production
EOF

echo "✅ backend/.env 파일 생성 완료"
echo ""

# 프론트엔드 .env 파일 생성
echo "📝 프론트엔드 환경 변수 설정"
echo "------------------------"

read -p "API Base URL (기본: http://$EC2_IP:8000): " API_URL
API_URL=${API_URL:-http://$EC2_IP:8000}

read -p "Google OAuth Client ID (선택사항): " FRONTEND_GOOGLE_ID

# 프론트엔드 .env 파일 생성
cat > frontend/.env << EOF
# API Base URL
VITE_API_BASE_URL=$API_URL

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=$FRONTEND_GOOGLE_ID
EOF

echo "✅ frontend/.env 파일 생성 완료"
echo ""
echo "🎉 환경 변수 설정 완료!"
echo ""
echo "다음 단계:"
echo "  ./deploy/ec2_quick_start.sh  # 빠른 배포 실행"

