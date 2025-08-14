#!/bin/bash
# Mira Dashboard Docker Build Script

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数定义
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 默认值
IMAGE_NAME="mira-dashboard"
TAG="latest"
CONTAINER_NAME="mira-dashboard"
PORT="3000"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -n|--name)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        --api-url)
            API_BASE_URL="$2"
            shift 2
            ;;
        build)
            ACTION="build"
            shift
            ;;
        run)
            ACTION="run"
            shift
            ;;
        stop)
            ACTION="stop"
            shift
            ;;
        clean)
            ACTION="clean"
            shift
            ;;
        push)
            ACTION="push"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS] [ACTION]"
            echo ""
            echo "Actions:"
            echo "  build    Build Docker image"
            echo "  run      Run Docker container"
            echo "  stop     Stop Docker container"
            echo "  clean    Remove Docker container and image"
            echo "  push     Push image to registry"
            echo ""
            echo "Options:"
            echo "  -t, --tag TAG         Docker image tag (default: latest)"
            echo "  -p, --port PORT       Host port to bind (default: 3000)"
            echo "  -n, --name NAME       Container name (default: mira-dashboard)"
            echo "  --api-url URL         API base URL (default: http://localhost:3999)"
            echo "  -h, --help            Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# 如果没有指定操作，默认为 build
if [ -z "$ACTION" ]; then
    ACTION="build"
fi

# 设置默认 API URL
if [ -z "$API_BASE_URL" ]; then
    API_BASE_URL="http://localhost:3999"
fi

# 执行操作
case $ACTION in
    build)
        log_info "Building Docker image: ${IMAGE_NAME}:${TAG}"
        
        # 检查 Dockerfile 是否存在
        if [ ! -f "Dockerfile" ]; then
            log_error "Dockerfile not found in current directory"
            exit 1
        fi
        
        # 构建镜像
        docker build -t "${IMAGE_NAME}:${TAG}" .
        
        if [ $? -eq 0 ]; then
            log_success "Docker image built successfully: ${IMAGE_NAME}:${TAG}"
            
            # 显示镜像信息
            log_info "Image details:"
            docker images "${IMAGE_NAME}:${TAG}"
        else
            log_error "Failed to build Docker image"
            exit 1
        fi
        ;;
        
    run)
        log_info "Running Docker container: ${CONTAINER_NAME}"
        
        # 停止现有容器
        if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            log_warning "Container ${CONTAINER_NAME} already exists, stopping and removing..."
            docker stop "${CONTAINER_NAME}" 2>/dev/null || true
            docker rm "${CONTAINER_NAME}" 2>/dev/null || true
        fi
        
        # 运行新容器
        docker run -d \
            --name "${CONTAINER_NAME}" \
            -p "${PORT}:80" \
            -e "API_BASE_URL=${API_BASE_URL}" \
            -e "SERVER_NAME=localhost" \
            "${IMAGE_NAME}:${TAG}"
        
        if [ $? -eq 0 ]; then
            log_success "Container started successfully"
            log_info "Dashboard available at: http://localhost:${PORT}"
            log_info "API proxied to: ${API_BASE_URL}"
            
            # 显示容器状态
            log_info "Container status:"
            docker ps --filter "name=${CONTAINER_NAME}"
        else
            log_error "Failed to start container"
            exit 1
        fi
        ;;
        
    stop)
        log_info "Stopping Docker container: ${CONTAINER_NAME}"
        
        if docker ps --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            docker stop "${CONTAINER_NAME}"
            log_success "Container stopped successfully"
        else
            log_warning "Container ${CONTAINER_NAME} is not running"
        fi
        ;;
        
    clean)
        log_info "Cleaning up Docker resources"
        
        # 停止并删除容器
        if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            log_info "Removing container: ${CONTAINER_NAME}"
            docker stop "${CONTAINER_NAME}" 2>/dev/null || true
            docker rm "${CONTAINER_NAME}" 2>/dev/null || true
        fi
        
        # 删除镜像
        if docker images --format 'table {{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}:${TAG}$"; then
            log_info "Removing image: ${IMAGE_NAME}:${TAG}"
            docker rmi "${IMAGE_NAME}:${TAG}"
        fi
        
        log_success "Cleanup completed"
        ;;
        
    push)
        log_info "Pushing Docker image to registry"
        
        # 检查镜像是否存在
        if ! docker images --format 'table {{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}:${TAG}$"; then
            log_error "Image ${IMAGE_NAME}:${TAG} not found. Please build first."
            exit 1
        fi
        
        # 推送镜像
        docker push "${IMAGE_NAME}:${TAG}"
        
        if [ $? -eq 0 ]; then
            log_success "Image pushed successfully"
        else
            log_error "Failed to push image"
            exit 1
        fi
        ;;
        
    *)
        log_error "Unknown action: $ACTION"
        exit 1
        ;;
esac
