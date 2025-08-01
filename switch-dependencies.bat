@echo off
setlocal

if "%~1"=="" (
    echo Usage: switch-dependencies.bat [online^|offline^|list^|build] [packages...] [options]
    echo.
    echo Examples:
    echo   switch-dependencies.bat online
    echo   switch-dependencies.bat offline
    echo   switch-dependencies.bat list
    echo   switch-dependencies.bat build
    echo   switch-dependencies.bat build mira-app-core --dry-run
    echo   switch-dependencies.bat online mira-app-core
    echo.
    goto :eof
)

if not "%~1"=="online" if not "%~1"=="offline" if not "%~1"=="list" if not "%~1"=="build" (
    echo Error: First parameter must be 'online', 'offline', 'list', or 'build'
    goto :eof
)

echo Executing dependency switch script...
node switch-dependencies.js %*

if %errorlevel% equ 0 (
    echo.
    echo Script executed successfully!
) else (
    echo.
    echo Script execution failed!
    exit /b %errorlevel%
)
