@echo off
cd /d "%~dp0"
echo Starting MIS Admin content update automation...
set ENV_FILE=.env.mis
node automation.js
pause
