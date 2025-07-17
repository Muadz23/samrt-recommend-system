@echo off
title Simple Local Server
echo ========================================
echo  Simple Local Web Server
echo ========================================
echo.
echo Starting simple HTTP server...
echo.
echo Server will be available at:
echo http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Try Python 3 first
python -m http.server 8000 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Python 3 not found, trying Python 2...
    python -m SimpleHTTPServer 8000 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Python not found. Trying Node.js live-server...
        npx live-server --port=8000 --no-browser 2>nul
        if %ERRORLEVEL% NEQ 0 (
            echo No suitable server found.
            echo Please install Python or Node.js
            pause
            exit /b 1
        )
    )
)

echo.
echo Server stopped.
pause
