@echo off
REM Docker build script for mira-dashboard

REM Set default values
set IMAGE_NAME=mira-dashboard
set IMAGE_TAG=latest
set API_BASE_URL=http://localhost:8081
set PORT=3999

REM Parse command line arguments
:parse_args
if "%~1"=="" goto :build
if "%~1"=="--image-name" (
    set IMAGE_NAME=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--tag" (
    set IMAGE_TAG=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--api-url" (
    set API_BASE_URL=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--port" (
    set PORT=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--optimized" (
    set USE_OPTIMIZED=true
    shift
    goto :parse_args
)
shift
goto :parse_args

:build
echo Building Docker image: %IMAGE_NAME%:%IMAGE_TAG%
echo API_BASE_URL: %API_BASE_URL%
echo PORT: %PORT%

if defined USE_OPTIMIZED (
    echo Using optimized Dockerfile...
    docker build ^
        --build-arg API_BASE_URL=%API_BASE_URL% ^
        --build-arg APP_PORT=%PORT% ^
        -f Dockerfile.optimized ^
        -t %IMAGE_NAME%:%IMAGE_TAG% .
) else (
    echo Using standard Dockerfile...
    docker build ^
        --build-arg API_BASE_URL=%API_BASE_URL% ^
        --build-arg APP_PORT=%PORT% ^
        -t %IMAGE_NAME%:%IMAGE_TAG% .
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Build successful!
    echo.
    echo To run the container:
    echo docker run -d -p %PORT%:%PORT% -e API_BASE_URL=%API_BASE_URL% -e PORT=%PORT% --name mira-dashboard %IMAGE_NAME%:%IMAGE_TAG%
    echo.
    echo To run with custom environment:
    echo docker run -d -p 4000:4000 -e API_BASE_URL=http://your-api-server:8081 -e PORT=4000 --name mira-dashboard %IMAGE_NAME%:%IMAGE_TAG%
) else (
    echo Build failed!
    exit /b 1
)
