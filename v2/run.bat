@echo off
cd /d "%~dp0"

:: Clear existing ports to avoid EADDRINUSE
for /f "tokens=5" %%a in ('netstat -aon ^| findstr "LISTENING" ^| findstr ":8085"') do taskkill /f /pid %%a 2>nul

:: Launch Electron Desktop Application
npx electron .

exit
