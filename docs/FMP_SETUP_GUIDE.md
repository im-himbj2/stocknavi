# FMP API 설정 가이드

## ✅ FMP API 키 설정

### 1. .env 파일에 API 키 추가

`D:\stock-portfolio\backend\.env` 파일을 열고 다음을 추가하세요:

```env
FMP_API_KEY=your_fmp_api_key_here
```

### 2. API 키 확인

FMP 대시보드에서 API 키를 확인하세요:
- 웹사이트: https://financialmodelingprep.com/
- 대시보드 → API Keys

## 📊 사용 가능한 엔드포인트

### 1. 경제 캘린더
```
GET /api/economic/calendar?start_date=2024-01-01&end_date=2024-01-31
```

### 2. 국채 수익률 (FMP)
```
GET /api/economic/treasury
```

### 3. 시장 지수
```
GET /api/economic/indices
```

### 4. 국채 수익률 (Yahoo Finance - 무료 대체)
```
GET /api/economic/treasury-yahoo/10y
GET /api/economic/treasury-yahoo/5y
GET /api/economic/treasury-yahoo/30y
```

### 5. API 사용량 정보
```
GET /api/economic/api-usage
```

## 🚀 최적화 전략

### 일 250회 제한 최적화

1. **캐싱 시스템**
   - 모든 API 응답은 1시간 동안 캐시됩니다
   - 같은 요청은 캐시에서 즉시 반환 (API 호출 없음)
   - 캐시 히트율이 높을수록 API 호출 절약

2. **Yahoo Finance 활용**
   - 국채 수익률 등 일부 데이터는 Yahoo Finance로 대체 가능
   - 무료이므로 대역폭 절약

3. **요청 최소화**
   - 프론트엔드에서 불필요한 반복 요청 방지
   - 데이터가 변경되지 않으면 재요청하지 않음

### 20GB 대역폭 최적화

1. **데이터 압축**
   - API 응답은 JSON 형식으로 최소화
   - 불필요한 필드 제거

2. **선택적 데이터 로딩**
   - 필요한 데이터만 요청
   - 페이지네이션 활용

3. **캐싱 활용**
   - 캐시된 데이터는 네트워크 요청 없음
   - 대역폭 절약 효과

## 📈 예상 사용량

### 일 250회 제한 기준

**최적 시나리오 (캐시 활용)**:
- 경제 캘린더: 일 1회 (캐시 1시간)
- 국채 수익률: 일 1회 (캐시 1시간)
- 시장 지수: 일 1회 (캐시 1시간)
- **총 API 호출: 일 3-5회** (여유 있음)

**일반 시나리오**:
- 사용자당 일 10회 요청
- 캐시 히트율 80%
- **실제 API 호출: 일 20-50회** (안전)

**최대 시나리오**:
- 사용자당 일 50회 요청
- 캐시 히트율 60%
- **실제 API 호출: 일 200-250회** (한계 근접)

## 🔧 모니터링

### API 사용량 확인
```bash
curl http://localhost:8000/api/economic/api-usage
```

### 캐시 상태 확인
- `cached: true` - 캐시에서 반환 (API 호출 없음)
- `cached: false` - 실제 API 호출

## ⚠️ 주의사항

1. **API 키 보안**
   - `.env` 파일은 Git에 커밋하지 마세요
   - `.gitignore`에 `.env` 추가 확인

2. **요청 제한**
   - 일 250회를 초과하면 API 호출 실패
   - 캐싱을 적극 활용하세요

3. **대역폭 모니터링**
   - 20GB 제한을 초과하지 않도록 주의
   - 캐싱으로 대역폭 절약

## 🎯 권장 사항

1. **초기 단계**: 캐시를 적극 활용하여 일 10회 이하로 유지
2. **성장 단계**: 사용량 모니터링하며 필요시 유료 플랜 고려
3. **확장 단계**: 프로페셔널 플랜($29/월, 일 750회) 업그레이드

## 📝 테스트

### API 테스트
```bash
# 경제 캘린더 조회
curl http://localhost:8000/api/economic/calendar

# 국채 수익률 조회
curl http://localhost:8000/api/economic/treasury

# API 사용량 확인
curl http://localhost:8000/api/economic/api-usage
```

### Python 테스트
```python
from app.services.data.fmp_economic import FMPEconomicProvider

provider = FMPEconomicProvider()
data = await provider.get_economic_calendar()
print(data)
```









