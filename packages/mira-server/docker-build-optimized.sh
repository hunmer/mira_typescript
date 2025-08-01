#!/bin/bash

# Docker 镜像优化构建脚本
# 使用该脚本来构建更小的 Docker 镜像

set -e

# 镜像名称
IMAGE_NAME="mira-server"
TAG="latest"

echo "🔨 开始构建优化的 Docker 镜像..."

# 构建镜像
docker build \
  --no-cache \
  --compress \
  --squash \
  -t "${IMAGE_NAME}:${TAG}" \
  .

echo "📊 镜像大小统计:"
docker images "${IMAGE_NAME}:${TAG}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo "🔍 镜像层分析:"
docker history "${IMAGE_NAME}:${TAG}" --human --format "table {{.CreatedBy}}\t{{.Size}}"

echo "✅ 构建完成！"

# 可选：移除悬挂镜像以清理空间
echo "🧹 清理悬挂镜像..."
docker image prune -f

echo "💡 提示："
echo "- 使用 'docker run -p 3000:3000 -p 8081:8081 ${IMAGE_NAME}:${TAG}' 运行容器"
echo "- 使用 'docker scout cves ${IMAGE_NAME}:${TAG}' 检查安全漏洞（如果安装了 Docker Scout）"
