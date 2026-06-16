@echo off
cd /d "%~dp0.."

:: Kill any existing processes using our target ports to avoid EADDRINUSE errors
for /f "tokens=5" %%a in ('netstat -aon ^| findstr "LISTENING" ^| findstr ":8085 :5173"') do taskkill /f /pid %%a 2>nul

:: Start FastAPI Backend Server visibly
start "Media Planner Backend" "C:\Users\emred\anaconda3\python.exe" "%~dp0backend\main.py"

:: Start Vite Dev Server visibly
start "MediaPlannerVite" cmd /c "cd /d "%~dp0frontend" && npm run dev < NUL"

exit

