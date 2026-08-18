@echo off
cd /d "%~dp0"
echo Starting MIS Admin headed verification...
set ENV_FILE=.env.mis
node verify_fields.js
pause
