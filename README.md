# StockNavi - 주식 투자 네비게이터

주식 투자자를 위한 종합 포트폴리오 관리 및 분석 플랫폼입니다.

## 주요 기능

1. **배당 분석**: 배당 캘린더, 배당 이력, 배당 수익률 분석
2. **기업 분석**: 재무제표 분석, 재무 지표, 동종업계 비교
3. **경제 지표 분석**: 주요 경제 지표 시각화 및 분석
4. **경제 연설 요약**: FOMC 회의록 및 경제 연설 AI 요약
5. **포트폴리오 관리**: 개인 포트폴리오 추적 및 관리

## 기술 스택

### 백엔드
- FastAPI
- PostgreSQL
- SQLAlchemy
- JWT 인증
- Redis (캐싱, 선택사항)

### 프론트엔드
- React 18
- Vite
- Tailwind CSS
- React Router
- Chart.js

## 빠른 시작

### 방법 1: Docker 사용 (선택사항)

```bash
cd deployment
docker-compose up
```

### 방법 2: 로컬 개발 (권장)

**Docker 없이도 개발 가능합니다!**

자세한 설정 방법은 [SETUP_LOCAL.md](./SETUP_LOCAL.md)를 참고하세요.

#### 간단 요약:

1. **데이터베이스**: Supabase 무료 계정 생성 (또는 로컬 PostgreSQL)
2. **백엔드**:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   # .env 파일 설정
   alembic upgrade head
   uvicorn app.main:app --reload
   ```
3. **프론트엔드**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 프로젝트 구조

```
stock-portfolio/
├── backend/
│   ├── app/
│   │   ├── api/          # API 엔드포인트
│   │   ├── core/         # 설정 및 유틸리티
│   │   ├── models/       # 데이터베이스 모델
│   │   ├── services/     # 비즈니스 로직
│   │   └── tasks/        # 백그라운드 작업
│   └── alembic/          # 데이터베이스 마이그레이션
└── frontend/
    └── src/
        ├── pages/        # 페이지 컴포넌트
        ├── components/   # 재사용 가능한 컴포넌트
        └── services/     # API 서비스
```

## 환경 변수

백엔드 `.env` 파일에 다음 변수들을 설정하세요:

- `DATABASE_URL`: PostgreSQL 연결 문자열 (Supabase 추천)
- `SECRET_KEY`: JWT 시크릿 키
- `ALPHA_VANTAGE_API_KEY`: Alpha Vantage API 키 (선택)
- `FRED_API_KEY`: FRED API 키 (선택)
- `REDIS_URL`: Redis 연결 URL (선택 - 없으면 인메모리 캐싱)

## 배포

- **Railway**: `deployment/railway.json` 참고
- **Render**: `deployment/render.yaml` 참고
- **Docker**: `deployment/Dockerfile` 참고

## 라이선스

MIT
