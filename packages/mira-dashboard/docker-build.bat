@echo off
REM Mira Dashboard Docker Build Script for Windows
setlocal enabledelayedexpansion
set $env:all_proxy=http://127.0.0.1:7890
REM 默认值
set IMAGE_NAME=mira-dashboard
set TAG=latest
set CONTAINER_NAME=mira-dashboard
set PORT=3000
set API_BASE_URL=http://localhost:3999
set ACTION=build

REM 解析命令行参数
:parse_args
if "%~1"=="" goto :execute_action
if "%~1"=="-t" (
    set TAG=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--tag" (
    set TAG=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="-p" (
    set PORT=%~2
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
if "%~1"=="-n" (
    set CONTAINER_NAME=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--name" (
    set CONTAINER_NAME=%~2
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
if "%~1"=="build" (
    set ACTION=build
    shift
    goto :parse_args
)
if "%~1"=="run" (
    set ACTION=run
    shift
    goto :parse_args
)
if "%~1"=="stop" (
    set ACTION=stop
    shift
    goto :parse_args
)
if "%~1"=="clean" (
    set ACTION=clean
    shift
    goto :parse_args
)
if "%~1"=="push" (
    set ACTION=push
    shift
    goto :parse_args
)
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help

echo [ERROR] Unknown option: %~1
exit /b 1

:show_help
echo Usage: %0 [OPTIONS] [ACTION]
echo.
echo Actions:
echo   build    Build Docker image
echo   run      Run Docker container
echo   stop     Stop Docker container
echo   clean    Remove Docker container and image
echo   push     Push image to registry
echo.
echo Options:
echo   -t, --tag TAG         Docker image tag (default: latest)
echo   -p, --port PORT       Host port to bind (default: 3000)
echo   -n, --name NAME       Container name (default: mira-dashboard)
echo   --api-url URL         API base URL (default: http://localhost:3999)
echo   -h, --help            Show this help message
exit /b 0

:execute_action
if "%ACTION%"=="build" goto :build_image
if "%ACTION%"=="run" goto :run_container
if "%ACTION%"=="stop" goto :stop_container
if "%ACTION%"=="clean" goto :clean_resources
if "%ACTION%"=="push" goto :push_image

echo [ERROR] Unknown action: %ACTION%
exit /b 1

:build_image
echo [INFO] Building Docker image: %IMAGE_NAME%:%TAG%

REM 检查 Dockerfile 是否存在
if not exist "Dockerfile" (
    echo [ERROR] Dockerfile not found in current directory
    exit /b 1
)

REM 构建镜像
docker build -t "%IMAGE_NAME%:%TAG%" .
if errorlevel 1 (
    echo [ERROR] Failed to build Docker image
    exit /b 1
)

echo [SUCCESS] Docker image built successfully: %IMAGE_NAME%:%TAG%
echo [INFO] Image details:
docker images "%IMAGE_NAME%:%TAG%"
goto :end

:run_container
echo [INFO] Running Docker container: %CONTAINER_NAME%

REM 检查容器是否已存在
docker ps -a --format "table {{.Names}}" | findstr /r "^%CONTAINER_NAME%$" >nul
if not errorlevel 1 (
    echo [WARNING] Container %CONTAINER_NAME% already exists, stopping and removing...
    docker stop "%CONTAINER_NAME%" 2>nul
    docker rm "%CONTAINER_NAME%" 2>nul
)

REM 运行新容器
docker run -d --name "%CONTAINER_NAME%" -p "%PORT%:80" -e "API_BASE_URL=%API_BASE_URL%" -e "SERVER_NAME=localhost" "%IMAGE_NAME%:%TAG%"
if errorlevel 1 (
    echo [ERROR] Failed to start container
    exit /b 1
)

echo [SUCCESS] Container started successfully
echo [INFO] Dashboard available at: http://localhost:%PORT%
echo [INFO] API proxied to: %API_BASE_URL%
echo [INFO] Container status:
docker ps --filter "name=%CONTAINER_NAME%"
goto :end

:stop_container
echo [INFO] Stopping Docker container: %CONTAINER_NAME%

docker ps --format "table {{.Names}}" | findstr /r "^%CONTAINER_NAME%$" >nul
if not errorlevel 1 (
    docker stop "%CONTAINER_NAME%"
    echo [SUCCESS] Container stopped successfully
) else (
    echo [WARNING] Container %CONTAINER_NAME% is not running
)
goto :end

:clean_resources
echo [INFO] Cleaning up Docker resources

REM 停止并删除容器
docker ps -a --format "table {{.Names}}" | findstr /r "^%CONTAINER_NAME%$" >nul
if not errorlevel 1 (
    echo [INFO] Removing container: %CONTAINER_NAME%
    docker stop "%CONTAINER_NAME%" 2>nul
    docker rm "%CONTAINER_NAME%" 2>nul
)

REM 删除镜像
docker images --format "table {{.Repository}}:{{.Tag}}" | findstr /r "^%IMAGE_NAME%:%TAG%$" >nul
if not errorlevel 1 (
    echo [INFO] Removing image: %IMAGE_NAME%:%TAG%
    docker rmi "%IMAGE_NAME%:%TAG%"
)

echo [SUCCESS] Cleanup completed
goto :end

:push_image
echo [INFO] Pushing Docker image to registry

REM 检查镜像是否存在
docker images --format "table {{.Repository}}:{{.Tag}}" | findstr /r "^%IMAGE_NAME%:%TAG%$" >nul
if errorlevel 1 (
    echo [ERROR] Image %IMAGE_NAME%:%TAG% not found. Please build first.
    exit /b 1
)

REM 推送镜像
docker push "%IMAGE_NAME%:%TAG%"
if errorlevel 1 (
    echo [ERROR] Failed to push image
    exit /b 1
)

echo [SUCCESS] Image pushed successfully
goto :end

:end
endlocal
