# FRED API 대체 방안

## 상업적 사용 제한
FRED API는 상업적 사용이 제한되어 있어, 상업적 배포를 위해 대체 API를 사용합니다.

## 구현된 대체 API

### 1. Yahoo Finance Economic (무료, 상업적 사용 가능)
- **파일**: `backend/app/services/data/yahoo_economic.py`
- **제공 지표**:
  - 10년/5년/30년 국채 수익률 (^TNX, ^FVX, ^TYX)
  - 달러 인덱스 (DX-Y.NYB)
  - 원유 가격 (CL=F)
  - 금 가격 (GC=F)
- **장점**: 완전 무료, 상업적 사용 가능, 이미 yfinance 사용 중

### 2. Alpha Vantage Economic (무료 티어, 상업적 사용 가능)
- **파일**: `backend/app/services/data/alpha_vantage_economic.py`
- **제공 지표**:
  - 실질 GDP (REAL_GDP)
  - 실업률 (UNEMPLOYMENT)
  - 소비자물가지수 (CPI)
  - 연방기금금리 (FEDERAL_FUNDS_RATE)
  - 국채 수익률 (TREASURY_YIELD)
- **가격**: 무료 티어 (일 5회), 유료 플랜 ($49.99/월)
- **API 키 필요**: `.env`에 `ALPHA_VANTAGE_API_KEY` 설정

## 사용 방법

### Yahoo Finance 사용 예시
```python
from app.services.data.yahoo_economic import YahooEconomicProvider

provider = YahooEconomicProvider()
data = await provider.get_treasury_10y()  # 10년 국채 수익률
```

### Alpha Vantage 사용 예시
```python
from app.services.data.alpha_vantage_economic import AlphaVantageEconomicProvider

provider = AlphaVantageEconomicProvider()
data = await provider.get_real_gdp()  # 실질 GDP
```

## 마이그레이션 가이드

1. **FRED API 제거**:
   - `backend/app/services/data/fred_api.py` - 사용하지 않음 (보관)
   - `backend/app/core/config.py` - `FRED_API_KEY` 제거 가능

2. **새 API 사용**:
   - Yahoo Finance: 즉시 사용 가능 (무료)
   - Alpha Vantage: API 키 필요 (무료 티어 사용 가능)

3. **Footer 업데이트**:
   - FRED 언급 제거 완료
   - Yahoo Finance + Alpha Vantage로 변경 완료

## 비용 비교

| 서비스 | 무료 티어 | 유료 플랜 | 상업적 사용 |
|--------|----------|----------|------------|
| FRED | ✅ | ❌ | ❌ (승인 필요) |
| Yahoo Finance | ✅ | N/A | ✅ |
| Alpha Vantage | ✅ (일 5회) | $49.99/월 | ✅ |
| FMP | ✅ (일 250회) | $14/월 | ✅ |

## 권장 사항

**초기 단계**: Yahoo Finance만 사용 (완전 무료)
**성장 단계**: Alpha Vantage 무료 티어 추가
**확장 단계**: Alpha Vantage 유료 플랜 또는 FMP 고려









