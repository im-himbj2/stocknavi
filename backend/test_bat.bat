@echo off
cd /d "%~dp0"
echo Current directory: %CD%
echo.
echo Testing Python...
python --version
echo.
echo Testing venv Python...
if exist "venv\Scripts\python.exe" (
    echo VENV Python found!
    venv\Scripts\python.exe --version
) else (
    echo VENV Python NOT found!
)
echo.
pause





















