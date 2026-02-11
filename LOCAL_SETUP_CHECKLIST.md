# 로컬 설정 체크리스트

EC2 배포 전에 로컬에서 확인하고 수정해야 할 항목들입니다.

## ✅ 1. 백엔드 환경 변수 확인

`backend/.env` 파일을 열고 다음 항목들을 확인하세요:

### 필수 항목

```env
# Google OAuth (중요!)
GOOGLE_CLIENT_ID=746675422451-s6bu7cdheovj2fmdbetg9er70adg2mat.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Frontend URL
FRONTEND_URL=https://stocknavi24.com

# Database (Supabase 사용 시)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# JWT
SECRET_KEY=your-very-secure-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 확인 사항

- [ ] `GOOGLE_CLIENT_ID`가 올바른지 확인
- [ ] `GOOGLE_CLIENT_SECRET`가 설정되어 있는지 확인
- [ ] `FRONTEND_URL`이 `https://stocknavi24.com`인지 확인
- [ ] `DATABASE_URL`이 Supabase 연결 문자열인지 확인 (또는 로컬 PostgreSQL)

## ✅ 2. 프론트엔드 환경 변수 확인

`frontend/.env` 파일을 열고 다음 항목들을 확인하세요:

### 필수 항목

```env
# API Base URL
VITE_API_BASE_URL=https://stocknavi24.com/api

# Google OAuth Client ID (백엔드와 동일해야 함!)
VITE_GOOGLE_CLIENT_ID=746675422451-s6bu7cdheovj2fmdbetg9er70adg2mat.apps.googleusercontent.com
```

### 확인 사항

- [ ] `VITE_GOOGLE_CLIENT_ID`가 백엔드의 `GOOGLE_CLIENT_ID`와 **정확히 동일**한지 확인
- [ ] `VITE_API_BASE_URL`이 `https://stocknavi24.com/api`인지 확인

## ✅ 3. Google Client ID 일치 확인

**가장 중요합니다!** 두 파일의 Google Client ID가 정확히 일치해야 합니다.

### 확인 방법

PowerShell에서:

```powershell
# 백엔드 Client ID 확인
Get-Content backend\.env | Select-String "GOOGLE_CLIENT_ID"

# 프론트엔드 Client ID 확인
Get-Content frontend\.env | Select-String "VITE_GOOGLE_CLIENT_ID"
```

두 값이 **정확히 동일**해야 합니다:
- ✅ `746675422451-s6bu7cdheovj2fmdbetg9er70adg2mat.apps.googleusercontent.com`
- ❌ 공백이나 따옴표가 있으면 안 됩니다

## ✅ 4. Google Cloud Console 설정 확인

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **API 및 서비스** > **사용자 인증 정보**
3. OAuth 2.0 클라이언트 ID 클릭
4. **승인된 JavaScript 출처**에 다음이 모두 추가되어 있는지 확인:
   - `https://stocknavi24.com`
   - `http://stocknavi24.com`
   - `https://www.stocknavi24.com`
   - `http://www.stocknavi24.com`
   - `http://13.209.70.3`
   - `https://13.209.70.3`

## ✅ 5. 코드 확인

### 백엔드 코드 확인

`backend/app/api/auth.py` 파일의 디버깅 로그가 추가되어 있는지 확인:

```python
# 클라이언트 ID 확인 (디버깅용 로그)
token_aud = idinfo.get('aud')
expected_client_id = settings.GOOGLE_CLIENT_ID
print(f"[Google OAuth Debug] 토큰의 aud: {token_aud}")
print(f"[Google OAuth Debug] 설정된 GOOGLE_CLIENT_ID: {expected_client_id}")
```

### 프론트엔드 코드 확인

`frontend/src/pages/Login.jsx`에서 Google OAuth가 올바르게 설정되어 있는지 확인

## ✅ 6. 로컬 테스트 (선택사항)

로컬에서 테스트하려면:

### 백엔드 테스트

```powershell
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --reload
```

### 프론트엔드 테스트

```powershell
cd frontend
npm run dev
```

**참고:** 로컬 테스트 시 `.env` 파일의 URL을 `http://localhost:8000` 등으로 변경해야 할 수 있습니다.

## ✅ 7. 최종 확인 체크리스트

EC2에 배포하기 전에:

- [ ] 백엔드 `.env` 파일의 모든 필수 항목이 설정되어 있음
- [ ] 프론트엔드 `.env` 파일의 모든 필수 항목이 설정되어 있음
- [ ] 두 파일의 `GOOGLE_CLIENT_ID`가 정확히 일치함
- [ ] Google Cloud Console에서 JavaScript 출처가 등록되어 있음
- [ ] `FRONTEND_URL`이 `https://stocknavi24.com`으로 설정되어 있음
- [ ] `VITE_API_BASE_URL`이 `https://stocknavi24.com/api`로 설정되어 있음

## 📝 수정이 필요한 경우

### 백엔드 .env 수정

```powershell
notepad backend\.env
```

### 프론트엔드 .env 수정

```powershell
notepad frontend\.env
```

## 🚀 다음 단계

모든 설정이 완료되면:

1. EC2 서버 정리 (`deploy/CLEAN_DEPLOYMENT_GUIDE.md` 참조)
2. 프로젝트 배포 (`deploy/quick_deploy.sh` 사용 또는 수동 배포)

