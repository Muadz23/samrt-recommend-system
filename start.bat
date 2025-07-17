@echo off
echo ========================================
echo  Smart Smartphone Recommendation System
echo ========================================
echo.
echo Starting Node.js server...
echo.

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js not found in PATH. Trying alternative path...
    if exist "C:\Program Files\nodejs\node.exe" (
        echo Found Node.js at C:\Program Files\nodejs\
        "C:\Program Files\nodejs\node.exe" server.js
    ) else (
        echo ERROR: Node.js not found!
        echo Please install Node.js from https://nodejs.org/
        pause
        exit /b 1
    )
) else (
    echo Node.js found in PATH
    node server.js
)

pause
