@echo off
title ZIM-ACMS Launcher
echo Starting ZIM-ACMS Server...

:: Project directory set karna
cd /d "%~dp0"

:: Server start karna (background mein)
start /b npm run dev

:: Server start hone ka wait karna (5 seconds)
timeout /t 5 /nobreak >nul

:: Browser mein app kholna
start http://localhost:5000

echo Application is running!