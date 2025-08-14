# 多阶段构建 Dockerfile for Mira Dashboard
# Stage 1: Build stage
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json (如果存在)
COPY package*.json ./

# 安装所有依赖（包括开发依赖，构建时需要）
RUN npm ci --silent

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# Stage 2: Production stage
FROM nginx:alpine AS production

# 安装必要的包
RUN apk add --no-cache tzdata

# 设置时区
ENV TZ=Asia/Shanghai

# 创建 nginx 用户目录
RUN mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /var/cache/nginx/proxy_temp && \
    mkdir -p /var/cache/nginx/fastcgi_temp && \
    mkdir -p /var/cache/nginx/uwsgi_temp && \
    mkdir -p /var/cache/nginx/scgi_temp

# 复制构建产物到 nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置文件
COPY nginx.conf /etc/nginx/nginx.conf

# 复制启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh

# 设置执行权限
RUN chmod +x /docker-entrypoint.sh

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# 设置标签
LABEL maintainer="mira-team" \
      version="1.0.1" \
      description="Mira Dashboard - Admin panel for Mira system management" \
      app="mira-dashboard"

# 启动命令
ENTRYPOINT ["/docker-entrypoint.sh"]
