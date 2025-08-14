@echo off
rem Mira Server 启动脚本 (批处理版本)
rem 使用方法: start-mira-app-server.bat [dev|prod]

setlocal

set MODE=%1
if "%MODE%"=="" set MODE=dev

set HTTP_PORT=3000
set WS_PORT=8081
set DATA_PATH=%~dp0data

rem 创建数据目录
if not exist "%DATA_PATH%" mkdir "%DATA_PATH%"

echo === Mira Server 启动 ===
echo 模式: %MODE%
echo HTTP 端口: %HTTP_PORT%
echo WebSocket 端口: %WS_PORT%
echo 数据路径: %DATA_PATH%
echo =========================

cd /d "%~dp0packages\mira-app-server"

if "%MODE%"=="prod" (
    echo 构建项目...
    npm run build
    if errorlevel 1 (
        echo 构建失败
        pause
        exit /b 1
    )
    
    echo 启动生产服务器...
    npm run start
) else (
    echo 启动开发服务器...
    npm run dev
)

pause
