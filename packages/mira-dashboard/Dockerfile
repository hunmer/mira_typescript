# 使用 Node.js 官方镜像作为基础镜像
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖（包括开发依赖，因为构建需要）
RUN npm ci && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装 serve 作为静态文件服务器
RUN npm install -g serve

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 创建启动脚本
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'serve -s dist -l ${PORT:-3999}' >> /app/start.sh && \
    chmod +x /app/start.sh

# 设置环境变量默认值
ENV PORT=3999
ENV API_BASE_URL=http://localhost:8081

# 暴露端口
EXPOSE 3999

# 启动应用
CMD ["/app/start.sh"]
