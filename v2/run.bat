@echo off
cd /d "%~dp0"

:: Kill any existing processes using our target ports to avoid EADDRINUSE errors
for /f "tokens=5" %%a in ('netstat -aon ^| findstr "LISTENING" ^| findstr ":8085 :5173"') do taskkill /f /pid %%a 2>nul

:: Start Node.js Backend Server
start "Media Planner Backend (Node.js)" cmd /k "node server/index.js"

:: Start Vite Dev Server
start "Media Planner Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

exit
