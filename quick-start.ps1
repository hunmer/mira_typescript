# Mira 项目快速启动菜单
# 运行此脚本可以选择不同的启动选项

function Show-Menu {
    Clear-Host
    Write-Host "================ Mira Server 启动菜单 ================" -ForegroundColor Cyan
    Write-Host "1. 开发模式启动服务器 (推荐)"
    Write-Host "2. 生产模式启动服务器"
    Write-Host "3. 构建所有包"
    Write-Host "4. 安装所有依赖"
    Write-Host "5. 测试核心包安全导入"
    Write-Host "6. 启动服务器 (自定义端口)"
    Write-Host "7. 查看项目结构"
    Write-Host "0. 退出"
    Write-Host "=====================================================" -ForegroundColor Cyan
}

function Build-All {
    Write-Host "构建所有包..." -ForegroundColor Blue
    Set-Location "packages"
    npm run build
    Set-Location ".."
}

function Install-All {
    Write-Host "安装所有依赖..." -ForegroundColor Blue
    Set-Location "packages"
    npm install
    npm run install-all
    Set-Location ".."
}

function Test-Import {
    Write-Host "测试核心包导入..." -ForegroundColor Blue
    node test-import.js
}

function Show-Structure {
    Write-Host "项目结构:" -ForegroundColor Green
    Write-Host @"
packages/
├── mira-core/          # 核心库 (不自动启动)
├── mira-server/        # 服务端应用
└── plugins/            # 插件目录
    ├── mira-demo/      # 演示插件
    └── mira-user/      # 用户管理插件

启动脚本:
├── start-mira-server.ps1  # PowerShell 启动脚本
├── start-mira-server.bat  # 批处理启动脚本
└── quick-start.ps1        # 这个快速启动菜单
"@
}

function Start-CustomPort {
    $httpPort = Read-Host "输入 HTTP 端口 (默认 3000)"
    $wsPort = Read-Host "输入 WebSocket 端口 (默认 8081)"
    
    if ([string]::IsNullOrEmpty($httpPort)) { $httpPort = 3000 }
    if ([string]::IsNullOrEmpty($wsPort)) { $wsPort = 8081 }
    
    .\start-mira-server.ps1 dev -HttpPort $httpPort -WsPort $wsPort
}

do {
    Show-Menu
    $choice = Read-Host "请选择选项 (0-7)"
    
    switch ($choice) {
        "1" {
            Write-Host "启动开发服务器..." -ForegroundColor Green
            .\start-mira-server.ps1 dev
            break
        }
        "2" {
            Write-Host "启动生产服务器..." -ForegroundColor Green
            .\start-mira-server.ps1 prod
            break
        }
        "3" {
            Build-All
            Read-Host "按任意键继续..."
            break
        }
        "4" {
            Install-All
            Read-Host "按任意键继续..."
            break
        }
        "5" {
            Test-Import
            Read-Host "按任意键继续..."
            break
        }
        "6" {
            Start-CustomPort
            break
        }
        "7" {
            Show-Structure
            Read-Host "按任意键继续..."
            break
        }
        "0" {
            Write-Host "退出..." -ForegroundColor Yellow
            break
        }
        default {
            Write-Host "无效选项，请重新选择" -ForegroundColor Red
            Start-Sleep 2
            break
        }
    }
} while ($choice -ne "0")
