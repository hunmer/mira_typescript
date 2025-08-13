# Mira Dashboard 开发配置指南

## 快速启动

### 1. 单独启动 Dashboard
```bash
# 方式一：使用脚本启动
./start-dashboard.bat          # Windows 批处理
./start-dashboard.ps1          # PowerShell
./start-dashboard.sh           # Bash/Linux

# 方式二：手动启动
cd packages/mira-dashboard
npm install
npm run dev
```

### 2. 启动完整全栈
```bash
# 方式一：使用脚本启动（推荐）
./start-full-stack.bat         # Windows 批处理
./start-full-stack.ps1         # PowerShell

# 方式二：使用 VS Code 任务
Ctrl+Shift+P -> Tasks: Run Task -> start-full-stack
```

## VS Code 配置

### 任务 (Tasks)
已配置以下任务，可通过 `Ctrl+Shift+P` -> `Tasks: Run Task` 运行：

- **install-dashboard-deps**: 安装 Dashboard 依赖
- **start-mira-dashboard-dev**: 启动 Dashboard 开发服务器
- **build-mira-dashboard**: 构建 Dashboard 生产版本
- **preview-mira-dashboard**: 预览 Dashboard 生产版本
- **start-full-stack**: 启动完整全栈（并行启动后端和前端）
- **build-full-stack**: 构建完整全栈（顺序构建所有组件）

### 调试配置 (Debug)
已配置以下调试配置，可通过 `F5` 或调试面板启动：

- **Debug Mira Dashboard (Chrome)**: 在 Chrome 中调试前端
- **Debug Mira Dashboard (Edge)**: 在 Edge 中调试前端
- **Debug Full Stack**: 调试完整全栈应用

### Workspace 设置
已配置以下开发环境设置：

- TypeScript 自动导入和提示
- ESLint 工作目录配置
- Vue/Vetur 设置
- TailwindCSS 智能提示
- Emmet 支持

## 端口配置

- **后端服务**: http://localhost:8080
- **前端服务**: http://localhost:3000
- **WebSocket**: ws://localhost:8081

## 环境变量

在 `packages/mira-dashboard/.env` 文件中配置：

```env
# 应用配置
VITE_APP_TITLE=Mira Dashboard
VITE_API_BASE_URL=http://localhost:8080

# 初始管理员配置
VITE_INITIAL_ADMIN_USERNAME=admin
VITE_INITIAL_ADMIN_PASSWORD=admin123
VITE_INITIAL_ADMIN_EMAIL=admin@mira.local
```

## 开发指南

### 项目结构
```
packages/mira-dashboard/
├── src/
│   ├── components/         # 可复用组件
│   │   ├── StatCard.vue
│   │   └── MonacoEditor.vue
│   ├── layouts/           # 布局组件
│   │   └── DashboardLayout.vue
│   ├── views/             # 页面组件
│   │   ├── Login.vue
│   │   ├── Overview.vue
│   │   ├── LibraryManager.vue
│   │   ├── PluginManager.vue
│   │   ├── AdminManager.vue
│   │   └── DatabaseViewer.vue
│   ├── router/            # 路由配置
│   ├── stores/            # Pinia 状态管理
│   ├── types/             # TypeScript 类型
│   ├── utils/             # 工具函数
│   └── style.css          # 全局样式
├── public/                # 静态资源
├── dist/                  # 构建输出
└── package.json
```

### 技术栈
- **Vue 3**: 前端框架 (Composition API)
- **Vite**: 构建工具
- **TypeScript**: 类型安全
- **Element Plus**: UI 组件库
- **TailwindCSS**: CSS 框架
- **Pinia**: 状态管理
- **Vue Router**: 路由管理
- **Monaco Editor**: 代码编辑器
- **Axios**: HTTP 客户端

### 开发命令
```bash
npm run dev         # 启动开发服务器
npm run build       # 构建生产版本
npm run preview     # 预览生产版本
npm run lint        # 代码检查
```

## 功能模块

### 1. 资源库管理器 (LibraryManager.vue)
- 资源库的增删改查
- 本地/远程资源库支持
- 搜索和筛选功能
- 文件统计信息

### 2. 插件管理器 (PluginManager.vue)
- 插件安装、卸载、更新
- 插件配置管理（Monaco编辑器）
- 插件状态控制（启用/禁用）
- 从本地文件或仓库安装

### 3. 管理员管理 (AdminManager.vue)
- 管理员账户管理
- 权限控制
- 环境变量初始管理员配置

### 4. 数据库预览器 (DatabaseViewer.vue)
- SQLite 数据库表浏览
- 数据的增删改查
- SQL 查询功能
- 数据导出（CSV）

## 开发注意事项

1. **代码风格**: 使用 ESLint + Prettier 保持代码规范
2. **类型安全**: 充分利用 TypeScript 类型检查
3. **组件化**: 遵循 Vue 3 Composition API 最佳实践
4. **响应式设计**: 使用 TailwindCSS 实现移动端适配
5. **错误处理**: 合理的错误提示和异常处理

## 常见问题

### Q: 前端无法连接后端？
A: 检查后端服务是否启动，确认 `VITE_API_BASE_URL` 配置正确。

### Q: 依赖安装失败？
A: 尝试清除缓存：`npm cache clean --force && rm -rf node_modules && npm install`

### Q: 构建失败？
A: 检查 TypeScript 类型错误，确保所有依赖都已正确安装。

### Q: 热重载不工作？
A: 检查 Vite 配置，确认文件监听权限正常。

## 生产部署

### 构建
```bash
npm run build
```

### 部署
将 `dist` 目录内容部署到 Web 服务器，确保：
1. 静态文件正确配置
2. API 代理设置正确
3. 路由回退到 `index.html`（SPA 模式）

### 环境变量
生产环境需要配置正确的 API 地址：
```env
VITE_API_BASE_URL=https://your-api-domain.com
```
