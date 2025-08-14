# Mira Dashboard Docker 部署指南

本文档介绍如何使用 Docker 构建和部署 Mira Dashboard。

## 📋 目录

- [概述](#概述)
- [文件说明](#文件说明)
- [快速开始](#快速开始)
- [构建选项](#构建选项)
- [环境变量](#环境变量)
- [网络配置](#网络配置)
- [故障排除](#故障排除)

## 🚀 概述

Mira Dashboard 是基于 Vue.js 的前端管理界面，使用多阶段 Docker 构建来优化镜像大小和部署效率。

### 技术栈
- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **UI 库**: Ant Design Vue
- **Web 服务器**: Nginx (Alpine)
- **容器化**: Docker

## 📁 文件说明

- `Dockerfile` - 多阶段构建文件
- `.dockerignore` - Docker 构建忽略文件
- `docker-compose.yml` - 完整系统编排文件
- `docker-build.sh` - Linux/macOS 构建脚本
- `docker-build.bat` - Windows 构建脚本

## 🏃‍♂️ 快速开始

### 方法 1: 使用构建脚本 (推荐)

#### Windows:
```batch
# 构建镜像
docker-build.bat build

# 运行容器
docker-build.bat run

# 停止容器
docker-build.bat stop

# 清理资源
docker-build.bat clean
```

#### Linux/macOS:
```bash
# 添加执行权限
chmod +x docker-build.sh

# 构建镜像
./docker-build.sh build

# 运行容器
./docker-build.sh run

# 停止容器
./docker-build.sh stop

# 清理资源
./docker-build.sh clean
```

### 方法 2: 直接使用 Docker 命令

#### 构建镜像:
```bash
docker build -t mira-dashboard:latest .
```

#### 运行容器:
```bash
docker run -d \
  --name mira-dashboard \
  -p 3000:80 \
  -e "API_BASE_URL=http://localhost:3999" \
  mira-dashboard:latest
```

### 方法 3: 使用 Docker Compose

```bash
# 启动完整系统
docker-compose up -d

# 仅启动 dashboard
docker-compose up -d mira-dashboard

# 停止系统
docker-compose down
```

## ⚙️ 构建选项

### 构建脚本参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-t, --tag` | 镜像标签 | `latest` |
| `-p, --port` | 主机端口 | `3000` |
| `-n, --name` | 容器名称 | `mira-dashboard` |
| `--api-url` | API 基础URL | `http://localhost:3999` |
| `-h, --help` | 显示帮助 | - |

### 示例用法

```bash
# 构建带自定义标签的镜像
./docker-build.sh build -t v1.0.1

# 运行在自定义端口并指定 API URL
./docker-build.sh run -p 3999 --api-url http://api.example.com

# 推送到镜像仓库
./docker-build.sh push -t v1.0.1
```

## 🌍 环境变量

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `API_BASE_URL` | 后端 API 地址 | `http://mira-app-server:3999` | `http://api.mira.com` |
| `SERVER_NAME` | Nginx 服务器名 | `localhost` | `dashboard.mira.com` |
| `TZ` | 时区设置 | `Asia/Shanghai` | `UTC` |

### 运行时设置环境变量

```bash
docker run -d \
  --name mira-dashboard \
  -p 3000:80 \
  -e "API_BASE_URL=https://api.production.com" \
  -e "SERVER_NAME=dashboard.production.com" \
  mira-dashboard:latest
```

## 🌐 网络配置

### 反向代理配置

Dashboard 内置了以下代理规则:

- `/api/*` → 代理到后端服务 (`API_BASE_URL`)
- `/ws` → WebSocket 连接代理
- `/*` → 静态文件服务 (SPA 模式)

### 端口映射

| 容器端口 | 协议 | 说明 |
|----------|------|------|
| `80` | HTTP | Web 服务端口 |

### 健康检查

容器提供健康检查端点:
- **URL**: `http://localhost/health`
- **响应**: `healthy`
- **间隔**: 30秒

```bash
# 检查容器健康状态
curl http://localhost:3000/health
```

## 🐛 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 检查 Docker 是否运行
docker --version

# 清理构建缓存
docker builder prune

# 重新构建
docker build --no-cache -t mira-dashboard:latest .
```

#### 2. 容器无法启动
```bash
# 查看容器日志
docker logs mira-dashboard

# 检查端口是否被占用
netstat -tulpn | grep :3000
```

#### 3. API 连接失败
```bash
# 检查网络连接
docker network ls
docker inspect bridge

# 验证 API 服务是否可达
docker exec mira-dashboard curl -f http://mira-app-server:3999/health
```

#### 4. 静态文件404
```bash
# 检查构建产物
docker exec mira-dashboard ls -la /usr/share/nginx/html

# 查看 Nginx 配置
docker exec mira-dashboard cat /etc/nginx/nginx.conf
```

### 调试命令

```bash
# 进入容器调试
docker exec -it mira-dashboard sh

# 查看 Nginx 访问日志
docker exec mira-dashboard tail -f /var/log/nginx/access.log

# 查看 Nginx 错误日志
docker exec mira-dashboard tail -f /var/log/nginx/error.log

# 测试 Nginx 配置
docker exec mira-dashboard nginx -t
```

### 性能优化

#### 1. 镜像大小优化
```bash
# 查看镜像层信息
docker history mira-dashboard:latest

# 使用 dive 分析镜像
docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  wagoodman/dive:latest mira-dashboard:latest
```

#### 2. 缓存优化
- 静态资源缓存: 1年
- HTML 文件缓存: 1小时
- API 请求: 无缓存

#### 3. 压缩优化
- Gzip 压缩已启用
- 支持的文件类型: js, css, html, json, xml, svg

## 📚 更多信息

- [Vue.js 官方文档](https://vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [Docker 官方文档](https://docs.docker.com/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 📄 许可证

ISC License
