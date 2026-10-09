@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS, then open this file again.
  pause
  exit /b 1
)
node --env-file-if-exists=.env scripts/launch.mjs
pause
