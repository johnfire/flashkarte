@echo off
REM FlashMD -- Windows installer
REM Creates a venv, installs the package, and adds Desktop + Start Menu shortcuts.
REM Usage: Double-click this file, or run from Command Prompt.

setlocal

set SCRIPT_DIR=%~dp0
set VENV=%SCRIPT_DIR%.venv

echo =^> Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: python not found.
    echo Install Python 3.10+ from https://www.python.org
    echo Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

echo =^> Creating virtual environment...
python -m venv "%VENV%"

echo =^> Installing FlashMD...
"%VENV%\Scripts\pip.exe" install --quiet -e "%SCRIPT_DIR%"

echo =^> Creating shortcuts...

REM Desktop shortcut
set DESKTOP=%USERPROFILE%\Desktop
set TARGET=%VENV%\Scripts\flashmd.exe

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $s = $ws.CreateShortcut('%DESKTOP%\FlashMD.lnk'); ^
   $s.TargetPath = '%TARGET%'; ^
   $s.WorkingDirectory = '%SCRIPT_DIR%'; ^
   $s.Description = 'FlashMD Flashcard App'; ^
   $s.Save()"

REM Start Menu shortcut
set STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $s = $ws.CreateShortcut('%STARTMENU%\FlashMD.lnk'); ^
   $s.TargetPath = '%TARGET%'; ^
   $s.WorkingDirectory = '%SCRIPT_DIR%'; ^
   $s.Description = 'FlashMD Flashcard App'; ^
   $s.Save()"

echo.
echo Done! Run FlashMD:
echo   Double-click the FlashMD shortcut on your Desktop
echo   Or from the Start Menu
echo   Or directly: %TARGET%
echo.
pause
