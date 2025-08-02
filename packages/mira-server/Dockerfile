# 使用Node.js官方镜像作为基础
FROM node:20-alpine

# 安装构建依赖和 FFmpeg（用于编译native modules如sqlite3）
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    sqlite \
    sqlite-dev \
    ffmpeg \
    ffmpeg-dev

# 创建工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 复制项目文件（需要在npm install之前复制，因为prepublish脚本会运行build）
COPY . .

# 设置环境变量修复distutils问题并安装依赖
ENV SETUPTOOLS_USE_DISTUTILS=stdlib
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

# 清理现有的node_modules和package-lock.json（如果存在）
RUN rm -rf node_modules package-lock.json

# 先安装依赖
RUN npm install

# 构建项目
RUN npm run build

# 验证 FFmpeg 安装
RUN ffmpeg -version && ffprobe -version

# 清理构建依赖以减小镜像大小（保留 ffmpeg）
RUN apk del python3 make g++ ffmpeg-dev

# 暴露端口
EXPOSE 3000
EXPOSE 8081

# 启动命令(使用JSON格式)
CMD ["npm", "start"]