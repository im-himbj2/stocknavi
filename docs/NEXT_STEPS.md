# 다음 단계 가이드

백엔드 `.env` 파일 설정이 완료되었으니 다음 단계를 진행하세요.

## ✅ 1단계: 프론트엔드 .env 파일 생성

로컬에서 `frontend/.env` 파일을 생성하세요:

```env
# API Base URL
VITE_API_BASE_URL=https://stocknavi24.com/api

# Google OAuth Client ID (백엔드 .env의 GOOGLE_CLIENT_ID와 동일한 값)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

**중요:** `your-google-client-id.apps.googleusercontent.com`를 실제 Google Client ID로 교체하세요.

## ✅ 2단계: Google Cloud Console에서 JavaScript 출처 등록

이 단계가 **가장 중요**합니다! `origin_mismatch` 오류를 해결하려면 반드시 해야 합니다.

### 2-1. Google Cloud Console 접속
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택

### 2-2. OAuth 2.0 클라이언트 ID 찾기
1. **API 및 서비스** > **사용자 인증 정보** 이동
2. **OAuth 2.0 클라이언트 ID** 섹션에서 웹 애플리케이션 클라이언트 ID 클릭

### 2-3. 승인된 JavaScript 출처 추가
**승인된 JavaScript 출처** 섹션에 다음을 **반드시** 추가:

```
https://stocknavi24.com
http://stocknavi24.com
https://www.stocknavi24.com
http://www.stocknavi24.com
http://13.209.70.3
https://13.209.70.3
```

**주의사항:**
- 프로토콜(`http://` 또는 `https://`)을 포함해야 합니다
- 마지막에 슬래시(`/`)를 붙이지 마세요
- 포트 번호가 있다면 포함 (예: `http://13.209.70.3:5173`)

### 2-4. 저장
1. **저장** 버튼 클릭
2. 변경사항 적용까지 1-5분 소요될 수 있습니다

## ✅ 3단계: EC2 서버에 환경 변수 업데이트

EC2 서버에 SSH 접속 후:

### 3-1. 백엔드 환경 변수 확인/업데이트

```bash
cd ~/stocknavi/backend
nano .env
```

다음 항목이 올바르게 설정되어 있는지 확인:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=https://stocknavi24.com
```

### 3-2. 프론트엔드 환경 변수 설정

```bash
cd ~/stocknavi/frontend
nano .env
```

다음 내용 입력:

```env
VITE_API_BASE_URL=https://stocknavi24.com/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

**중요:** `your-google-client-id.apps.googleusercontent.com`를 실제 Google Client ID로 교체하세요.

## ✅ 4단계: 프론트엔드 재빌드

환경 변수를 변경했으므로 프론트엔드를 재빌드해야 합니다:

```bash
cd ~/stocknavi/frontend
npm run build
```

## ✅ 5단계: 서비스 재시작

```bash
# PM2로 실행 중인 경우
pm2 restart stocknavi-backend
pm2 restart stocknavi-frontend

# 또는 전체 재시작
pm2 restart all

# 로그 확인
pm2 logs
```

## ✅ 6단계: 테스트

1. 브라우저에서 `https://stocknavi24.com/login` 접속
2. Google 로그인 버튼 클릭
3. 오류 없이 Google 로그인 화면이 표시되는지 확인

## 문제 해결

### 여전히 origin_mismatch 오류가 발생하는 경우

1. **브라우저 캐시 삭제**: `Ctrl + Shift + Delete`
2. **시크릿 모드에서 테스트**
3. **Google Cloud Console 확인**:
   - JavaScript 출처가 정확히 입력되었는지 확인
   - 저장 후 5분 정도 기다렸는지 확인
4. **환경 변수 확인**:
   ```bash
   # EC2에서 확인
   cd ~/stocknavi/backend && cat .env | grep GOOGLE
   cd ~/stocknavi/frontend && cat .env | grep GOOGLE
   ```

### Internal server error가 발생하는 경우

1. **백엔드 로그 확인**:
   ```bash
   pm2 logs stocknavi-backend
   ```
2. **데이터베이스 연결 확인**: Supabase 연결 문자열이 올바른지 확인
3. **환경 변수 확인**: 모든 필수 환경 변수가 설정되었는지 확인

## 참고 문서

- `deploy/GOOGLE_OAUTH_SETUP.md` - Google OAuth 상세 설정
- `deploy/SUPABASE_SETUP.md` - Supabase 설정 (선택사항)
- `deploy/PRODUCTION_ENV_SETUP.md` - 전체 환경 변수 가이드


