# Mira Dashboard

基于 Vue3 + Vite + TailwindCSS + Element Plus 构建的 Mira 系统后台管理面板。

## 功能特性

- 🎯 **资源库管理器** - 管理本地和远程资源库，支持增删改查
- 🔌 **插件管理器** - 插件的安装、配置、启用/禁用管理
- 👥 **管理员管理** - 管理员账户的添加、删除和权限管理
- 🗄️ **SQLite数据库预览** - 可视化数据库表结构和数据，支持SQL查询
- 🔧 **环境配置** - 支持通过环境变量设置初始管理员账号

## 技术栈

- **前端框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **UI组件**: Element Plus
- **样式框架**: TailwindCSS
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **代码编辑器**: Monaco Editor
- **HTTP客户端**: Axios
- **数据库**: SQLite (通过 sql.js)

## 环境变量配置

在 `.env` 文件中设置以下环境变量：

```env
# 应用配置
VITE_APP_TITLE=Mira Dashboard
VITE_API_BASE_URL=http://localhost:8080

# 初始管理员配置
VITE_INITIAL_ADMIN_USERNAME=admin
VITE_INITIAL_ADMIN_PASSWORD=admin123
VITE_INITIAL_ADMIN_EMAIL=admin@mira.local
```

## 开发环境启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 项目结构

```
src/
├── components/          # 可复用组件
│   ├── StatCard.vue    # 统计卡片组件
│   └── MonacoEditor.vue # 代码编辑器组件
├── layouts/            # 布局组件
│   └── DashboardLayout.vue # 主要布局
├── router/             # 路由配置
│   └── index.ts
├── stores/             # Pinia状态管理
│   └── auth.ts         # 认证状态管理
├── types/              # TypeScript类型定义
│   ├── auth.ts         # 认证相关类型
│   └── index.ts        # 通用类型
├── utils/              # 工具函数
│   └── api.ts          # API请求工具
├── views/              # 页面组件
│   ├── Login.vue       # 登录页面
│   ├── Overview.vue    # 概览页面
│   ├── LibraryManager.vue    # 资源库管理
│   ├── PluginManager.vue     # 插件管理
│   ├── AdminManager.vue      # 管理员管理
│   └── DatabaseViewer.vue    # 数据库预览
├── App.vue             # 根组件
├── main.ts             # 应用入口
└── style.css           # 全局样式
```

## 主要功能模块

### 1. 资源库管理器
- 显示所有资源库列表
- 支持本地和远程资源库
- 提供搜索和状态筛选
- 支持新增、编辑、删除资源库
- 显示文件数量和存储大小

### 2. 插件管理器
- 卡片式展示所有已安装插件
- 支持插件的启用/禁用
- 提供插件配置界面（Monaco编辑器）
- 支持从本地文件或仓库安装插件
- 插件更新和卸载功能

### 3. 管理员管理
- 管理员账户列表展示
- 支持添加新管理员
- 编辑管理员信息
- 删除管理员（不能删除自己）
- 环境变量初始管理员配置提示

### 4. SQLite数据库预览
- 左侧展示所有数据库表
- 表结构和数据的可视化展示
- 支持自定义SQL查询
- 数据的增删改查操作
- 支持表数据导出为CSV

## API接口

项目预期与以下API端点交互：

```
# 认证
POST /auth/login
GET /auth/me

# 资源库
GET /libraries
POST /libraries
PUT /libraries/:id
DELETE /libraries/:id
PATCH /libraries/:id/status

# 插件
GET /plugins
POST /plugins/install
PUT /plugins/:id/config
GET /plugins/:id/config
PATCH /plugins/:id/status
DELETE /plugins/:id

# 管理员
GET /admins
POST /admins
PUT /admins/:id
DELETE /admins/:id

# 数据库
GET /database/tables
GET /database/tables/:table/data
GET /database/tables/:table/schema
POST /database/query
POST /database/tables/:table/rows
PUT /database/tables/:table/rows
DELETE /database/tables/:table/rows
```

## 默认登录信息

- 用户名: admin
- 密码: admin123

可通过环境变量自定义初始管理员账号。

## 开发说明

1. 项目使用 TypeScript 进行开发，确保类型安全
2. 使用 Element Plus 作为UI组件库，提供丰富的组件
3. 采用 TailwindCSS 进行样式开发，快速构建界面
4. 使用 Pinia 进行状态管理，简洁高效
5. Monaco Editor 提供代码编辑功能，支持语法高亮
6. 响应式设计，适配不同屏幕尺寸

## 注意事项

- 确保后端API服务正在运行
- 检查API_BASE_URL配置是否正确
- SQLite数据库功能需要后端支持sql.js或提供相应的API接口
- 插件上传功能需要后端支持文件上传处理
