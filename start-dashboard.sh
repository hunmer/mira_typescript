#!/bin/bash

# Mira Dashboard 启动脚本

echo "🚀 启动 Mira Dashboard..."

# 检查 Node.js 版本
NODE_VERSION=$(node --version)
echo "📦 Node.js 版本: $NODE_VERSION"

# 进入 dashboard 目录
cd "$(dirname "$0")/packages/mira-dashboard"

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖中..."
    npm install
fi

# 启动开发服务器
echo "🎯 启动开发服务器..."
echo "📍 访问地址: http://localhost:3000"
echo "⚡ 按 Ctrl+C 停止服务器"
echo ""

npm run dev
