# 删除 dist 文件夹
Remove-Item -Recurse -Force ./dist

# 安装依赖
npm install

# 构建项目
npm run build

# 清理生产依赖
npm prune --production

# 链接 n8n
npm link

# 设置环境变量
$env:N8N_LOG_OUTPUT = "console"
$env:N8N_LOG_LEVEL = "debug"
$env:N8N_PAYLOAD_SIZE_MAX = "64"
$env:N8N_FORMDATA_FILE_SIZE_MAX = "500"

# 启动 n8n
npx n8n