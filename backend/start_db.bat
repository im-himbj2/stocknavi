@echo off
chcp 65001 >nul
echo ========================================
echo PostgreSQL 데이터베이스 시작 안내
echo ========================================
echo.
echo 방법 1: Docker Desktop 사용 (권장)
echo   1. Docker Desktop을 실행하세요
echo   2. 다음 명령어를 실행하세요:
echo      cd deploy
echo      docker-compose up -d db
echo.
echo 방법 2: PostgreSQL 직접 설치
echo   1. PostgreSQL을 설치하세요 (https://www.postgresql.org/download/windows/)
echo   2. 서비스를 시작하세요:
echo      - Windows 서비스 관리자에서 "postgresql-x64-XX" 서비스 시작
echo      - 또는 명령어: net start postgresql-x64-XX
echo.
echo 방법 3: Docker Desktop 없이 Docker 사용
echo   - Docker Desktop을 설치하고 실행하세요
echo.
echo 현재 상태 확인:
netstat -ano | findstr :5432
if errorlevel 1 (
    echo [상태] PostgreSQL이 실행되지 않았습니다.
) else (
    echo [상태] PostgreSQL이 실행 중입니다.
)
echo.
pause















