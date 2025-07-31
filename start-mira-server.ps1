# Mira Server 启动脚本
# 使用方法: .\start-mira-server.ps1 [dev|prod] [选项]

param(
    [string]$Mode = "dev",
    [int]$HttpPort = 3000,
    [int]$WsPort = 8081,
    [string]$DataPath = "",
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Mira Server 启动脚本

用法: .\start-mira-server.ps1 [模式] [选项]

模式:
  dev     开发模式 (使用 ts-node，默认)
  prod    生产模式 (使用编译后的 JS)

选项:
  -HttpPort <端口>    HTTP 服务器端口 (默认: 3000)
  -WsPort <端口>      WebSocket 服务器端口 (默认: 8081)
  -DataPath <路径>    数据目录路径 (默认: ./data)
  -Help              显示此帮助信息

示例:
  .\start-mira-server.ps1                           # 开发模式，默认设置
  .\start-mira-server.ps1 prod                      # 生产模式
  .\start-mira-server.ps1 dev -HttpPort 4000        # 开发模式，自定义端口
"@
    exit 0
}

# 设置默认数据路径
if ([string]::IsNullOrEmpty($DataPath)) {
    $DataPath = Join-Path $PSScriptRoot "data"
}

# 确保数据目录存在
if (!(Test-Path $DataPath)) {
    New-Item -ItemType Directory -Path $DataPath -Force | Out-Null
    Write-Host "创建数据目录: $DataPath" -ForegroundColor Green
}

# 设置环境变量
$env:HTTP_PORT = $HttpPort
$env:WS_PORT = $WsPort
$env:DATA_PATH = $DataPath

Write-Host "=== Mira Server 启动 ===" -ForegroundColor Cyan
Write-Host "模式: $Mode" -ForegroundColor Yellow
Write-Host "HTTP 端口: $HttpPort" -ForegroundColor Yellow
Write-Host "WebSocket 端口: $WsPort" -ForegroundColor Yellow
Write-Host "数据路径: $DataPath" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Cyan

# 切换到服务器目录
$ServerPath = Join-Path $PSScriptRoot "packages\mira-server"
Set-Location $ServerPath

try {
    if ($Mode -eq "prod") {
        # 生产模式 - 先构建，然后运行
        Write-Host "构建项目..." -ForegroundColor Blue
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "构建失败"
        }
        
        Write-Host "启动生产服务器..." -ForegroundColor Green
        npm run start
    } else {
        # 开发模式
        Write-Host "启动开发服务器..." -ForegroundColor Green
        npm run dev
    }
} catch {
    Write-Host "启动失败: $_" -ForegroundColor Red
    exit 1
}
