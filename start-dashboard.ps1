# Mira Dashboard 启动脚本

Write-Host "🚀 启动 Mira Dashboard..." -ForegroundColor Green
Write-Host ""

# 检查 Node.js 版本
$nodeVersion = node --version
Write-Host "📦 Node.js 版本: $nodeVersion" -ForegroundColor Blue
Write-Host ""

# 进入 dashboard 目录
$dashboardPath = Join-Path (Split-Path $MyInvocation.MyCommand.Path) "packages\mira-dashboard"
Set-Location $dashboardPath

# 检查依赖是否已安装
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 安装依赖中..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# 启动开发服务器
Write-Host "🎯 启动开发服务器..." -ForegroundColor Green
Write-Host "📍 访问地址: http://localhost:3000" -ForegroundColor Cyan
Write-Host "⚡ 按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""

npm run dev
