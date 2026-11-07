@echo off
echo ============================================
echo   Life Upgrade System - Web Server
echo ============================================
echo.
echo Starting Flask server at http://127.0.0.1:5000
echo Press Ctrl+C to stop.
echo.
cd /d "%~dp0"
python app.py
pause
