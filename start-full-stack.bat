@echo off
chcp 65001 >nul
title Mira Full Stack

echo 🚀 启动 Mira 全栈应用...
echo.

rem 检查 Node.js 版本
for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
echo 📦 Node.js 版本: %NODE_VERSION%
echo.

rem 进入项目根目录
cd /d "%~dp0"

echo 🔧 构建后端服务...
cd packages\mira-core
if not exist "node_modules" (
    echo 📦 安装 mira-core 依赖...
    call npm install
)
call npm run rebuild

cd ..\mira-server
if not exist "node_modules" (
    echo 📦 安装 mira-server 依赖...
    call npm install
)
call npm run build

echo.
echo 🎨 准备前端应用...
cd ..\mira-dashboard
if not exist "node_modules" (
    echo 📦 安装 mira-dashboard 依赖...
    call npm install
)

echo.
echo 🚀 启动服务...
echo 📍 后端服务: http://localhost:8080
echo 📍 前端服务: http://localhost:3000
echo ⚡ 按 Ctrl+C 停止所有服务
echo.

rem 使用 start 命令在新窗口中启动后端服务
start "Mira Server" cmd /c "cd /d \"%~dp0packages\mira-server\" && npm run dev"

rem 等待2秒让后端服务启动
timeout /t 2 /nobreak >nul

rem 启动前端服务
call npm run dev
