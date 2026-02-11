# 토큰의 클라이언트 ID가 일치하지 않습니다 - 해결 방법

이 오류는 백엔드와 프론트엔드의 Google Client ID가 일치하지 않을 때 발생합니다.

## 원인

1. EC2 서버의 백엔드 `.env` 파일의 `GOOGLE_CLIENT_ID`와 프론트엔드 `.env` 파일의 `VITE_GOOGLE_CLIENT_ID`가 다름
2. EC2 서버의 환경 변수가 업데이트되지 않음
3. PM2가 이전 환경 변수를 캐시하고 있음

## 해결 방법

### 1단계: EC2 서버에서 환경 변수 확인

EC2 서버에 SSH 접속 후:

```bash
# 백엔드 Client ID 확인
cd ~/stocknavi/backend
cat .env | grep GOOGLE_CLIENT_ID

# 프론트엔드 Client ID 확인
cd ~/stocknavi/frontend
cat .env | grep VITE_GOOGLE_CLIENT_ID
```

**두 값이 정확히 동일해야 합니다!**

### 2단계: 환경 변수 수정

두 값이 다르면 수정:

```bash
# 백엔드 .env 수정
cd ~/stocknavi/backend
nano .env
# GOOGLE_CLIENT_ID를 올바른 값으로 수정
# 예: GOOGLE_CLIENT_ID=746675422451-s6bu7cdheovj2fmdbetg9er70adg2mat.apps.googleusercontent.com

# 프론트엔드 .env 수정
cd ~/stocknavi/frontend
nano .env
# VITE_GOOGLE_CLIENT_ID를 백엔드와 동일하게 수정
# 예: VITE_GOOGLE_CLIENT_ID=746675422451-s6bu7cdheovj2fmdbetg9er70adg2mat.apps.googleusercontent.com
```

### 3단계: PM2 완전히 재시작

환경 변수를 변경했으므로 PM2를 완전히 재시작:

```bash
# 모든 프로세스 삭제
pm2 delete all

# 백엔드 재시작
cd ~/stocknavi/backend
source venv/bin/activate
pm2 start venv/bin/uvicorn --name stocknavi-backend --interpreter venv/bin/python -- app.main:app --host 0.0.0.0 --port 8000

# 프론트엔드 재시작 (환경 변수 변경 후 재빌드 필요)
cd ~/stocknavi/frontend
npm run build
pm2 serve dist --name stocknavi-frontend --spa --port 5173

# 저장
pm2 save
```

### 4단계: 로그 확인

```bash
# 백엔드 로그 확인 (디버깅 정보 확인)
pm2 logs stocknavi-backend --lines 50

# 다음 메시지들을 확인:
# [Google OAuth Debug] 토큰의 aud: ...
# [Google OAuth Debug] 설정된 GOOGLE_CLIENT_ID: ...
```

두 값이 일치해야 합니다!

## 빠른 해결 스크립트

EC2 서버에서 실행:

```bash
#!/bin/bash

# 올바른 Client ID (실제 값으로 변경)
CORRECT_CLIENT_ID="746675422451-s6bu7cdheovj2fmdbetg9er70adg2mat.apps.googleusercontent.com"

# 백엔드 .env 수정
cd ~/stocknavi/backend
sed -i "s/GOOGLE_CLIENT_ID=.*/GOOGLE_CLIENT_ID=$CORRECT_CLIENT_ID/" .env

# 프론트엔드 .env 수정
cd ~/stocknavi/frontend
sed -i "s/VITE_GOOGLE_CLIENT_ID=.*/VITE_GOOGLE_CLIENT_ID=$CORRECT_CLIENT_ID/" .env

# 확인
echo "=== 백엔드 ==="
grep GOOGLE_CLIENT_ID ~/stocknavi/backend/.env
echo "=== 프론트엔드 ==="
grep VITE_GOOGLE_CLIENT_ID ~/stocknavi/frontend/.env

# PM2 재시작
pm2 delete all
cd ~/stocknavi/backend
source venv/bin/activate
pm2 start venv/bin/uvicorn --name stocknavi-backend --interpreter venv/bin/python -- app.main:app --host 0.0.0.0 --port 8000
cd ~/stocknavi/frontend
npm run build
pm2 serve dist --name stocknavi-frontend --spa --port 5173
pm2 save

echo "✅ 완료! 로그 확인: pm2 logs stocknavi-backend"
```

## 확인 방법

브라우저에서:
1. `https://stocknavi24.com/login` 접속
2. Google 로그인 버튼 클릭
3. 오류 없이 로그인되는지 확인

## 여전히 문제가 있는 경우

1. **브라우저 캐시 삭제**: `Ctrl + Shift + Delete`
2. **시크릿 모드에서 테스트**
3. **Google Cloud Console 확인**: Client ID가 올바른지 확인
4. **로그 확인**: `pm2 logs stocknavi-backend`에서 디버깅 메시지 확인

