# 多阶段构建 - 构建阶段
FROM node:20-alpine AS builder

# 安装构建依赖
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    sqlite-dev \
    && rm -rf /var/cache/apk/*

# 设置环境变量
ENV SETUPTOOLS_USE_DISTUTILS=stdlib

# 创建工作目录
WORKDIR /app

# 复制package.json和package-lock.json（利用Docker缓存）
COPY package*.json ./

# 安装所有依赖（开发和生产）
RUN npm ci && npm cache clean --force

# 复制源代码和配置文件
COPY src/ ./src/
COPY tsconfig.json ./

# 构建项目
RUN npm run build && \
    # 删除开发依赖
    npm prune --production && \
    # 清理构建缓存
    rm -rf /tmp/* /root/.npm

# 多阶段构建 - 运行阶段
FROM node:20-alpine AS runtime

# 只安装运行时必需的系统依赖
RUN apk add --no-cache \
    sqlite \
    ffmpeg \
    && rm -rf /var/cache/apk/*

# 设置环境变量
ENV NODE_ENV=production \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    FFPROBE_PATH=/usr/bin/ffprobe

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mira -u 1001

# 创建工作目录并设置权限
WORKDIR /app
RUN chown mira:nodejs /app

# 切换到非root用户
USER mira

# 复制package.json
COPY --chown=mira:nodejs package*.json ./

# 从构建阶段复制node_modules（只包含生产依赖）
COPY --from=builder --chown=mira:nodejs /app/node_modules ./node_modules

# 从构建阶段复制编译后的文件
COPY --from=builder --chown=mira:nodejs /app/dist ./dist

# 健康检查（可选）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check')" || exit 1

# 暴露端口
EXPOSE 3000
EXPOSE 8081

# 启动命令
CMD ["node", "dist/index.js"]