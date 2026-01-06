@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo Starting Stock Portfolio Backend
echo ========================================
echo Current directory: %CD%
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.11 or later.
    echo.
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment!
        echo.
        pause
        exit /b 1
    )
    echo Virtual environment created successfully.
    echo.
)

REM Use venv Python directly
set VENV_PYTHON=venv\Scripts\python.exe

REM Check if venv Python exists
if not exist "%VENV_PYTHON%" (
    echo [ERROR] Virtual environment Python not found at:
    echo %CD%\%VENV_PYTHON%
    echo.
    echo Please delete the venv folder and run this script again.
    echo.
    pause
    exit /b 1
)

REM Install/upgrade dependencies
echo Checking and installing dependencies...
"%VENV_PYTHON%" -m pip install --upgrade pip --quiet
if errorlevel 1 (
    echo [WARNING] Failed to upgrade pip, continuing anyway...
)

"%VENV_PYTHON%" -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies!
    echo.
    pause
    exit /b 1
)
echo Dependencies installed successfully.
echo.

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file...
    if exist ".env.example" (
        copy .env.example .env >nul
        echo Created .env from .env.example
    ) else (
        (
            echo DATABASE_URL=postgresql://stockuser:stockpass@localhost:5432/stock_portfolio
            echo SECRET_KEY=devsecret
            echo ALGORITHM=HS256
            echo ACCESS_TOKEN_EXPIRE_MINUTES=30
            echo REDIS_URL=redis://localhost:6379/0
            echo ENVIRONMENT=development
        ) > .env
        echo Created default .env file
    )
    echo.
    echo [IMPORTANT] Please edit .env file with your settings!
    echo.
)

REM Check if PostgreSQL is running
echo Checking PostgreSQL status...
netstat -ano | findstr :5432 >nul 2>&1
if errorlevel 1 (
    echo [INFO] PostgreSQL is not running. Attempting to start with Docker...
    echo.
    
    REM Check if Docker is available
    docker --version >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Docker is not installed or not in PATH.
        echo Please start PostgreSQL manually or install Docker Desktop.
        echo.
        echo Options:
        echo   1. Install Docker Desktop and run: cd deploy && docker-compose up -d db
        echo   2. Install PostgreSQL and start the service
        echo   3. Continue without database (some features may not work)
        echo.
        choice /C YN /M "Continue without database"
        if errorlevel 2 (
            echo Exiting...
            pause
            exit /b 1
        )
        goto SKIP_DB
    )
    
    REM Try to start database with Docker
    echo Starting PostgreSQL with Docker...
    cd /d "%~dp0\..\deploy"
    if exist "docker-compose.yml" (
        docker-compose up -d db
        if errorlevel 1 (
            echo [WARNING] Failed to start database with Docker.
            echo Please start PostgreSQL manually.
            echo.
            choice /C YN /M "Continue without database"
            if errorlevel 2 (
                echo Exiting...
                pause
                exit /b 1
            )
            goto SKIP_DB
        )
        echo Waiting for database to be ready...
        timeout /t 5 /nobreak >nul
        cd /d "%~dp0"
    ) else (
        echo [WARNING] docker-compose.yml not found in deploy directory.
        echo Please start PostgreSQL manually.
        echo.
        choice /C YN /M "Continue without database"
        if errorlevel 2 (
            echo Exiting...
            pause
            exit /b 1
        )
        goto SKIP_DB
    )
    cd /d "%~dp0"
) else (
    echo [INFO] PostgreSQL is already running.
    echo.
)

REM Run database migrations
echo Running database migrations...
"%VENV_PYTHON%" -m alembic upgrade head
if errorlevel 1 (
    echo [WARNING] Database migration failed. This is OK if database is not available.
    echo Some features may not work without database.
    echo.
) else (
    echo [INFO] Database migrations completed successfully.
    echo.
)

:SKIP_DB

REM Start server
echo ========================================
echo Starting FastAPI server...
echo Server will be available at http://localhost:8000
echo Press CTRL+C to stop the server
echo ========================================
echo.
"%VENV_PYTHON%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start!
    echo.
    pause
    exit /b 1
)
