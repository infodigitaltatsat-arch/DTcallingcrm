@echo off
title VoiceFlow CRM - Startup
color 0B
echo.
echo ============================================================
echo    VoiceFlow Calling CRM - Project Startup
echo ============================================================
echo.

:: ============================================================
:: STEP 0: Verify project structure (catches "ran from inside
:: the zip" / bad extraction issues before they cause confusing
:: errors later on)
:: ============================================================
if not exist "%~dp0backend\" (
    color 0C
    echo [ERROR] Could not find the backend folder next to start.bat.
    echo.
    echo This usually means the ZIP file was not fully extracted first.
    echo Please:
    echo   1. Right-click the ZIP file and choose Extract All
    echo   2. Open the extracted CallingProject folder
    echo   3. Confirm backend, frontend, and start.bat are all in that
    echo      SAME folder
    echo   4. Double-click start.bat from there ^(no need to Run as Admin^)
    echo.
    pause
    exit /b 1
)
if not exist "%~dp0frontend\" (
    color 0C
    echo [ERROR] Could not find the frontend folder next to start.bat.
    echo Please fully extract the ZIP file first, then run start.bat again.
    pause
    exit /b 1
)

:: ============================================================
:: STEP 1: Check Node.js
:: ============================================================
echo [STEP 1/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is NOT installed!
    echo Please install Node.js from: https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER% detected.
echo.

:: ============================================================
:: STEP 2: Database Setup
:: ============================================================
echo [STEP 2/5] Database Setup...
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [Docker FOUND] Starting MongoDB container...
    docker compose up -d >nul 2>&1
    if %errorlevel% neq 0 (
        docker-compose up -d
    )
    timeout /t 4 /nobreak >nul
    echo [OK] Docker MongoDB started.
) else (
    echo [INFO] Docker not found. Using local MongoDB.
    echo [INFO] Make sure MongoDB is running at the URI in backend\.env.
)
echo.

:: ============================================================
:: STEP 3: Backend Setup
:: ============================================================
echo [STEP 3/5] Setting up Backend (Express + MongoDB)...
cd /d "%~dp0backend"
:: Change this value before deployment to set the private Admin Audit password.
set "ADMIN_AUDIT_PASSWORD=Admin@2026!"
if not exist "%cd%\package.json" (
    color 0C
    echo [ERROR] Failed to enter the backend folder. Aborting to avoid
    echo running install commands in the wrong directory.
    pause
    exit /b 1
)

echo  [3a] Installing backend dependencies...
call npm install 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] npm install had some issues, continuing anyway...
)

echo  [3b] Seeding MongoDB demo accounts and sample contacts...
call npm run seed 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] MongoDB seed failed. Check MongoDB and MONGODB_URI in backend\.env
    cd /d "%~dp0"
    pause
    exit /b 1
) else (
    echo  [OK] MongoDB seeded successfully.
)

cd /d "%~dp0"
echo  [OK] Backend setup complete.
echo.

:: ============================================================
:: STEP 4: Frontend Setup
:: ============================================================
echo [STEP 4/5] Setting up Frontend (React + Vite)...
cd /d "%~dp0frontend"
if not exist "%cd%\package.json" (
    color 0C
    echo [ERROR] Failed to enter the frontend folder. Aborting to avoid
    echo running install commands in the wrong directory.
    pause
    exit /b 1
)

echo  Installing frontend dependencies...
call npm install 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Frontend npm install failed!
    cd /d "%~dp0"
    pause
    exit /b 1
)
echo  [OK] Frontend setup complete.
cd /d "%~dp0"
echo.

:: ============================================================
:: STEP 5: Launch Both Servers
:: ============================================================
echo [STEP 5/5] Launching servers...
echo.

start "VoiceFlow - Backend [Port 5000]" cmd /k "color 0A && title Backend - Port 5000 && cd /d "%~dp0backend" && npm run dev"
timeout /t 2 /nobreak >nul
start "VoiceFlow - Frontend [Port 5173]" cmd /k "color 0B && title Frontend - Port 5173 && cd /d "%~dp0frontend" && npm run dev"

echo.
echo ============================================================
echo   VOICEFLOW CRM IS STARTING!
echo ============================================================
echo.
echo   App URL:    http://localhost:5173
echo   API URL:    http://localhost:5000/api
echo.
echo   Two windows have opened:
echo   GREEN = Backend server (Express + Socket.io)
echo   BLUE  = Frontend server (Vite + React)
echo.
echo   Wait ~5 seconds, then open: http://localhost:5173
echo ============================================================
echo.
pause
