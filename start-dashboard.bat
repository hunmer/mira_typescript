@echo off
chcp 65001 >nul
title Mira Dashboard

echo 🚀 启动 Mira Dashboard...
echo.

rem 检查 Node.js 版本
for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
echo 📦 Node.js 版本: %NODE_VERSION%
echo.

rem 进入 dashboard 目录
cd /d "%~dp0packages\mira-dashboard"

rem 检查依赖是否已安装
if not exist "node_modules" (
    echo 📦 安装依赖中...
    call npm install
    echo.
)

rem 启动开发服务器
echo 🎯 启动开发服务器...
echo 📍 访问地址: http://localhost:3000
echo ⚡ 按 Ctrl+C 停止服务器
echo.

call npm run dev

pause
