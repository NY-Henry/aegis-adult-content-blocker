@echo off
title Aegis Guard Launcher
cd /d "%~dp0"
set "AEGIS_EXECUTABLE=%~dp0artifacts\Aegis-Guard-Fixed.exe"
if not exist "%AEGIS_EXECUTABLE%" set "AEGIS_EXECUTABLE=%~dp0artifacts\Aegis-Guard-Updated.exe"
if not exist "%AEGIS_EXECUTABLE%" set "AEGIS_EXECUTABLE=%~dp0src-tauri\target\release\aegis-shield.exe"
if not exist "%AEGIS_EXECUTABLE%" (
    echo [ERROR] No built Aegis Guard executable was found. Build the app first.
    pause
    exit /b 1
)
tasklist /FI "IMAGENAME eq aegis-shield.exe" /NH | find /I "aegis-shield.exe" >nul
if %errorlevel% == 0 (
    echo [INFO] Aegis Guard is already running. Close the old instance before launching another.
    echo [INFO] If the old version has no Quit menu, end aegis-shield.exe in Task Manager once.
    pause
    exit /b 0
)
tasklist /FI "IMAGENAME eq Aegis-Guard-Updated.exe" /NH | find /I "Aegis-Guard-Updated.exe" >nul
if %errorlevel% == 0 (
    echo [INFO] Aegis Guard is already running. Open it from the system tray.
    exit /b 0
)
tasklist /FI "IMAGENAME eq Aegis-Guard-Fixed.exe" /NH | find /I "Aegis-Guard-Fixed.exe" >nul
if %errorlevel% == 0 (
    echo [INFO] Aegis Guard is already running. Open it from the system tray.
    exit /b 0
)
net session >nul 2>&1
if %errorlevel% == 0 (
    start "" "%AEGIS_EXECUTABLE%"
) else (
    powershell -NoProfile -Command "Start-Process -FilePath $env:AEGIS_EXECUTABLE -Verb RunAs"
)
exit /b 0
