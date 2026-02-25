# AWS 배포 가이드

## 1. 인프라 구성

### EC2 인스턴스
- **타입**: t3.medium 이상 권장
- **OS**: Ubuntu 22.04 LTS
- **보안 그룹**:
  - HTTP (80) - 모든 IP
  - HTTPS (443) - 모든 IP
  - SSH (22) - 본인 IP만
  - PostgreSQL (5432) - 내부 네트워크만

### RDS PostgreSQL
- **엔진**: PostgreSQL 15
- **인스턴스 클래스**: db.t3.micro (개발) / db.t3.small (프로덕션)
- **스토리지**: 20GB 이상
- **백업**: 자동 백업 활성화
- **보안 그룹**: EC2 인스턴스에서만 접근 가능

### Route 53 (도메인)
- 도메인 등록 또는 기존 도메인 연결
- A 레코드로 EC2 IP 연결

## 2. 환경 변수 설정

`.env.production` 파일 생성:

```bash
# Database
DATABASE_URL=postgresql://user:password@rds-endpoint:5432/stock_portfolio

# JWT
SECRET_KEY=your-very-secure-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# API Keys
FMP_API_KEY=your_fmp_api_key
FRED_API_KEY=your_fred_api_key
OPENAI_API_KEY=your_openai_api_key

# Frontend
FRONTEND_URL=https://yourdomain.com

# Environment
ENVIRONMENT=production
```

## 3. SSL 인증서 설정 (Let's Encrypt)

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 4. 배포 스크립트 실행

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

## 5. 모니터링 설정

### CloudWatch
- EC2 인스턴스 메트릭 모니터링
- RDS 성능 모니터링
- 로그 수집

### 알람 설정
- CPU 사용률 > 80%
- 메모리 사용률 > 80%
- 디스크 사용률 > 80%
- 데이터베이스 연결 수 > 80%

## 6. 백업 전략

### 데이터베이스 백업
- RDS 자동 백업: 일일 스냅샷
- 수동 백업: 주 1회 S3에 저장

### 애플리케이션 백업
- 코드: GitHub 저장소
- 환경 변수: AWS Secrets Manager

## 7. 보안 체크리스트

- [ ] 모든 API 키를 환경 변수로 관리
- [ ] 데이터베이스 비밀번호 강력하게 설정
- [ ] HTTPS 강제 설정
- [ ] CORS 설정 확인
- [ ] Rate limiting 활성화
- [ ] 로그 모니터링 설정
- [ ] 정기적인 보안 업데이트

## 8. 성능 최적화

- CloudFront CDN 설정 (선택)
- RDS 읽기 전용 복제본 (선택)
- Redis 캐싱 (선택)
- 로드 밸런서 (선택)






















