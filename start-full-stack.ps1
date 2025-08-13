# Mira 全栈启动脚本

Write-Host "🚀 启动 Mira 全栈应用..." -ForegroundColor Green
Write-Host ""

# 检查 Node.js 版本
$nodeVersion = node --version
Write-Host "📦 Node.js 版本: $nodeVersion" -ForegroundColor Blue
Write-Host ""

# 获取项目根目录
$rootPath = Split-Path $MyInvocation.MyCommand.Path

# 构建后端服务
Write-Host "🔧 构建后端服务..." -ForegroundColor Yellow

# 构建 mira-core
$coreePath = Join-Path $rootPath "packages\mira-core"
Set-Location $coreePath
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 安装 mira-core 依赖..." -ForegroundColor Cyan
    npm install
}
npm run rebuild

# 构建 mira-server
$serverPath = Join-Path $rootPath "packages\mira-server"
Set-Location $serverPath
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 安装 mira-server 依赖..." -ForegroundColor Cyan
    npm install
}
npm run build

Write-Host ""
Write-Host "🎨 准备前端应用..." -ForegroundColor Yellow

# 准备 mira-dashboard
$dashboardPath = Join-Path $rootPath "packages\mira-dashboard"
Set-Location $dashboardPath
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 安装 mira-dashboard 依赖..." -ForegroundColor Cyan
    npm install
}

Write-Host ""
Write-Host "🚀 启动服务..." -ForegroundColor Green
Write-Host "📍 后端服务: http://localhost:8080" -ForegroundColor Cyan
Write-Host "📍 前端服务: http://localhost:3000" -ForegroundColor Cyan
Write-Host "⚡ 按 Ctrl+C 停止所有服务" -ForegroundColor Yellow
Write-Host ""

# 在后台启动后端服务
$serverJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    npm run dev
} -ArgumentList $serverPath

# 等待2秒让后端服务启动
Start-Sleep -Seconds 2

# 启动前端服务
try {
    npm run dev
} finally {
    # 清理后台作业
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
}
