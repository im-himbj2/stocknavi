@echo off
echo Starting Stock Portfolio Frontend (Local Development)
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Start development server
echo.
echo Starting Vite development server...
echo Frontend will be available at http://localhost:5173
echo.
call npm run dev

