# Google OAuth 설정 가이드

이 가이드는 Google OAuth 2.0을 설정하여 `origin_mismatch` 오류를 해결하는 방법을 설명합니다.

## 문제: origin_mismatch 오류

Google OAuth에서 `400 오류: origin_mismatch`가 발생하는 이유는 Google Cloud Console에 JavaScript 출처가 등록되지 않았기 때문입니다.

## 해결 방법

### 1단계: Google Cloud Console 접속

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 (또는 새 프로젝트 생성)

### 2단계: OAuth 2.0 클라이언트 ID 설정

1. **API 및 서비스** > **사용자 인증 정보**로 이동
2. **OAuth 2.0 클라이언트 ID** 섹션에서 기존 클라이언트 ID를 클릭하거나 **+ 사용자 인증 정보 만들기** > **OAuth 2.0 클라이언트 ID** 선택

### 3단계: 승인된 JavaScript 출처 추가

**승인된 JavaScript 출처** 섹션에 다음을 추가:

```
https://stocknavi24.com
http://stocknavi24.com
https://www.stocknavi24.com
http://www.stocknavi24.com
http://13.209.70.3
https://13.209.70.3
```

**중요:**
- 프로토콜(`http://` 또는 `https://`)을 포함해야 합니다
- 포트 번호가 있는 경우 포함 (예: `http://13.209.70.3:5173`)
- 마지막에 슬래시(`/`)를 포함하지 마세요

### 4단계: 승인된 리디렉션 URI 추가 (필요한 경우)

**승인된 리디렉션 URI** 섹션에 다음을 추가:

```
https://stocknavi24.com
http://stocknavi24.com
https://stocknavi24.com/api/auth/google/callback
http://stocknavi24.com/api/auth/google/callback
```

### 5단계: 설정 저장

1. **저장** 버튼 클릭
2. 변경사항이 적용되는 데 몇 분이 걸릴 수 있습니다

### 6단계: 환경 변수 확인

EC2 서버에서 환경 변수가 올바르게 설정되어 있는지 확인:

**백엔드 `.env` 파일:**
```env
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
FRONTEND_URL=https://stocknavi24.com
```

**프론트엔드 `.env` 파일:**
```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
VITE_API_BASE_URL=https://stocknavi24.com/api
```

### 7단계: 서비스 재시작

환경 변수를 변경한 경우 서비스를 재시작:

```bash
# PM2로 실행 중인 경우
pm2 restart stocknavi-backend
pm2 restart stocknavi-frontend

# 또는 전체 재시작
pm2 restart all
```

## 확인 방법

1. 브라우저에서 `https://stocknavi24.com/login` 접속
2. Google 로그인 버튼 클릭
3. 오류 없이 Google 로그인 화면이 표시되는지 확인

## 문제 해결

### 여전히 origin_mismatch 오류가 발생하는 경우

1. **브라우저 캐시 삭제**: `Ctrl + Shift + Delete`로 캐시 삭제
2. **시크릿 모드에서 테스트**: 캐시 문제를 제외하기 위해
3. **Google Cloud Console 확인**: 
   - JavaScript 출처가 정확히 입력되었는지 확인
   - 프로토콜(`http://` 또는 `https://`)이 올바른지 확인
   - 슬래시(`/`)가 마지막에 없는지 확인
4. **환경 변수 확인**: EC2 서버에서 실제 환경 변수 값 확인
   ```bash
   cd ~/stocknavi/backend
   cat .env | grep GOOGLE
   
   cd ~/stocknavi/frontend
   cat .env | grep GOOGLE
   ```

### HTTPS 설정이 필요한 경우

프로덕션 환경에서는 HTTPS를 사용하는 것이 권장됩니다. Let's Encrypt를 사용하여 무료 SSL 인증서를 설정할 수 있습니다.

## 참고사항

- Google OAuth 설정 변경사항은 최대 5분 정도 걸릴 수 있습니다
- 개발 환경과 프로덕션 환경에서 다른 OAuth 클라이언트 ID를 사용하는 것이 좋습니다
- `localhost`는 자동으로 승인되지만, 프로덕션 도메인은 명시적으로 추가해야 합니다

