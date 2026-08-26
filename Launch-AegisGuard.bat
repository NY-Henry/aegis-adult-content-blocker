@echo off
title Aegis Guard Launcher
cd /d "%~dp0"

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running with Administrator privileges...
    start "" "%~dp0src-tauri\target\release\aegis-shield.exe"
) else (
    echo [INFO] Requesting Administrator privileges...
    powershell -Command "Start-Process '%~dp0src-tauri\target\release\aegis-shield.exe' -Verb RunAs"
)
exit /b 0
