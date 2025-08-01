@echo off
setlocal enabledelayedexpansion

REM Docker 镜像优化构建脚本 (Windows版本)
REM 使用该脚本来构建更小的 Docker 镜像

set IMAGE_NAME=mira-server
set TAG=latest

echo 🔨 开始构建优化的 Docker 镜像...

REM 先检查网络连接
echo 🔍 检查 Docker Hub 连接...
docker pull hello-world:latest > nul 2>&1
if !errorlevel! neq 0 (
    echo ⚠️  Docker Hub 连接有问题，将使用备用方案
    set USE_CN_MIRROR=1
) else (
    echo ✅ Docker Hub 连接正常
    set USE_CN_MIRROR=0
)

echo.
if !USE_CN_MIRROR! equ 1 (
    echo 🇨🇳 使用国内镜像源构建...
    docker build -f Dockerfile.distroless-cn -t "%IMAGE_NAME%:%TAG%" .
) else (
    echo 🌍 使用标准镜像构建...
    docker build --no-cache --compress -t "%IMAGE_NAME%:%TAG%" .
)

if !errorlevel! neq 0 (
    echo ❌ 构建失败！
    echo.
    echo 🔧 故障排除建议：
    echo 1. 运行 docker-network-check.bat 检查网络
    echo 2. 尝试使用: docker build -f Dockerfile.distroless-cn -t %IMAGE_NAME%:%TAG% .
    echo 3. 或配置 Docker 镜像加速器
    pause
    exit /b 1
)

echo.
echo 📊 镜像大小统计:
docker images "%IMAGE_NAME%:%TAG%" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo.
echo 🔍 镜像层分析:
docker history "%IMAGE_NAME%:%TAG%" --human --format "table {{.CreatedBy}}\t{{.Size}}"

echo.
echo ✅ 构建完成！

REM 可选：移除悬挂镜像以清理空间
echo.
echo 🧹 清理悬挂镜像...
docker image prune -f

echo.
echo 💡 提示：
echo - 使用 'docker run -p 3000:3000 -p 8081:8081 %IMAGE_NAME%:%TAG%' 运行容器
echo - 使用 'docker scout cves %IMAGE_NAME%:%TAG%' 检查安全漏洞（如果安装了 Docker Scout）

pause
