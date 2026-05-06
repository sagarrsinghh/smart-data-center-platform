@echo off
echo ====================================
echo   Syncing changes to GitHub...
echo ====================================
echo.

:: Get the commit message from the first argument, or use a default timestamp
set message="%~1"
if %message%=="" set message="Auto-commit: %date% %time%"

:: 1. Stage all changes
git add .

:: 2. Commit the changes
git commit -m %message%

:: 3. Push to GitHub
git push

echo.
echo ====================================
echo   Successfully synced to GitHub!
echo ====================================
pause
