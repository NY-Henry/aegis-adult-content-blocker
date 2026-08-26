@echo off
title Aegis Guard — Emergency System Reset & Unblock
color 0A

:: Self-elevation check
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Administrator rights required. Requesting UAC elevation...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b 0
)

echo ================================================================
echo           AEGIS GUARD — EMERGENCY SYSTEM RESTORE TOOL           
echo ================================================================
echo.
echo [1/4] Reverting DNS on all network adapters to DHCP (Default)...
powershell -NoProfile -Command "Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.HardwareInterface -eq $true } | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses -ErrorAction SilentlyContinue }"

echo [2/4] Restoring original Windows Hosts file...
powershell -NoProfile -Command "$hostsPath = 'C:\Windows\System32\drivers\etc\hosts'; if (Test-Path $hostsPath) { $content = Get-Content $hostsPath -Raw; $cleaned = $content -replace '(?s)# >>> BEGIN AEGIS GUARD BLOCKLIST <<<.*?# >>> END AEGIS GUARD BLOCKLIST <<<', ''; Set-Content -Path $hostsPath -Value $cleaned.Trim() -Force }"

echo [3/4] Removing browser lockdown registry policies...
reg delete "HKLM\SOFTWARE\Policies\Google\Chrome" /v "IncognitoModeAvailability" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Google\Chrome" /v "ForceGoogleSafeSearch" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Google\Chrome" /v "ForceYouTubeRestrict" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Google\Chrome" /v "DnsOverHttpsMode" /f >nul 2>&1

reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "InPrivateModeAvailability" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "ForceGoogleSafeSearch" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "ForceSafeSearch" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "ForceYouTubeRestrict" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "DnsOverHttpsMode" /f >nul 2>&1

reg delete "HKLM\SOFTWARE\Policies\BraveSoftware\Brave" /v "IncognitoModeAvailability" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\BraveSoftware\Brave" /v "DnsOverHttpsMode" /f >nul 2>&1

reg delete "HKLM\SOFTWARE\Policies\Mozilla\Firefox" /v "DisablePrivateBrowsing" /f >nul 2>&1

echo [4/4] Flushing Windows DNS Cache...
ipconfig /flushdns >nul 2>&1

echo.
echo ================================================================
echo   SUCCESS: All settings, DNS, and browser policies are restored!
echo ================================================================
echo.
pause
exit /b 0
