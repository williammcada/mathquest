@echo off
title MathQuest v0.14.0 - session engine (teacher passcode)
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)
echo Installing the locked deployment tools...
call npm ci --no-audit --no-fund
if errorlevel 1 goto :failed
echo Running automated checks...
call npm test
if errorlevel 1 goto :failed
call npm run build
if errorlevel 1 goto :failed
echo Updating your existing mathquest-prototype Cloudflare Worker...
call npx wrangler deploy
if errorlevel 1 goto :failed
echo.
echo BACKEND DEPLOYMENT SUCCEEDED.
echo Frontend source belongs in public in the GitHub repository. Do not copy it over the repository root.
echo Publish the matching GitHub candidate when you are ready for hosted review.
echo Keep GitHub Pages set to main and / (root).
echo The Netlify relay needs to remain active. No Netlify upload is normally required.
echo Read docs/releases/v0.14.0-teacher-passcode.md for deployment and test instructions.
echo Then confirm https://mcada-mathquest.onrender.com/api/health reports version 0.14.0.
pause
exit /b 0
:failed
echo.
echo Update stopped. Do not upload the frontend until this succeeds.
echo Copy the error above if you need help.
pause
exit /b 1
