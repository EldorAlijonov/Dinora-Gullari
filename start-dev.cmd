@echo off
setlocal
set "ROOT=%~dp0"

cd /d "%ROOT%"
docker compose up -d

start "Dinora Backend" cmd /k "pushd ""%ROOT%backend"" && npm.cmd run dev"
start "Dinora Frontend" cmd /k "pushd ""%ROOT%frontend"" && npm.cmd run dev -- --host 0.0.0.0"

echo.
echo Dinora Gullari ishga tushmoqda.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
echo MongoDB:  localhost:27017
echo.
