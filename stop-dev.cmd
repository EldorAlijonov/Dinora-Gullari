@echo off
setlocal
set "ROOT=%~dp0"

for /f "tokens=2 delims==; " %%P in ('wmic process where "name='node.exe' and commandline like '%%%ROOT:\=\\%%%'" get ProcessId /format:list ^| find "="') do (
  taskkill /PID %%P /F >nul 2>nul
)

cd /d "%ROOT%"
docker compose stop

echo Dinora Gullari dev servislar to'xtatildi.
