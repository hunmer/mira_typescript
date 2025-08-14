# 路由模块重构说明

## 概述

`HttpRouter.ts` 中的 `setupRoutes` 方法已经被重构，按功能分离到不同的路由模块中，提高了代码的可维护性和可读性。

## 新的路由结构

### 1. 资源库路由 (`LibraryRoutes.ts`)
**路径**: `/api/libraries`
**功能**:
- `GET /` - 获取资源库列表
- `POST /` - 创建新资源库
- `PUT /:id` - 更新资源库
- `PATCH /:id/status` - 切换资源库状态
- `DELETE /:id` - 删除资源库

### 2. 插件路由 (`PluginRoutes.ts`)
**路径**: `/api/plugins`
**功能**:
- `GET /` - 获取插件列表
- `POST /install` - 安装插件（从npm）
- `PATCH /:id/status` - 插件状态切换
- `GET /:id/config` - 获取插件配置
- `PUT /:id/config` - 更新插件配置
- `DELETE /:id` - 卸载插件

### 3. 数据库路由 (`DatabaseRoutes.ts`)
**路径**: `/api/database`
**功能**:
- `GET /tables` - 获取数据库表列表
- `GET /tables/:tableName/data` - 获取表数据
- `GET /tables/:tableName/schema` - 获取表结构

### 4. 文件路由 (`FileRoutes.ts`)
**路径**: `/api/`
**功能**:
- `POST /libraries/upload` - 上传文件到资源库
- `GET /thumb/:libraryId/:id` - 获取文件缩略图
- `GET /file/:libraryId/:id` - 获取文件内容

## 文件结构

```
packages/mira-app-core/src/
├── HttpRouter.ts           # 主路由器（简化后）
└── routes/
    ├── index.ts           # 路由模块导出文件
    ├── LibraryRoutes.ts   # 资源库管理路由
    ├── PluginRoutes.ts    # 插件管理路由
    ├── DatabaseRoutes.ts  # 数据库管理路由
    └── FileRoutes.ts      # 文件处理路由
```

## 主要改进

1. **模块化**: 每个功能模块都有自己的路由文件，职责分离清晰
2. **可维护性**: 代码更容易理解和维护
3. **可扩展性**: 新功能可以轻松添加新的路由模块
4. **代码复用**: 路由模块可以独立测试和复用

## 使用方式

在 `HttpRouter.ts` 中，现在只需要简单地导入和注册各个路由模块：

```typescript
private setupRoutes(): void {
  // 使用分离的路由模块
  const libraryRoutes = new LibraryRoutes(this.backend);
  const pluginRoutes = new PluginRoutes(this.backend);
  const databaseRoutes = new DatabaseRoutes(this.backend);
  const fileRoutes = new FileRoutes(this.backend);

  // 注册各个路由模块
  this.router.use('/libraries', libraryRoutes.getRouter());
  this.router.use('/plugins', pluginRoutes.getRouter());
  this.router.use('/database', databaseRoutes.getRouter());
  this.router.use('/', fileRoutes.getRouter());
}
```

## 注意事项

1. 每个路由模块都接收 `MiraBackend` 实例作为构造参数
2. 文件上传功能（multer配置）已移动到 `FileRoutes` 中
3. 所有路由都保持向后兼容，API端点没有变化
4. 辅助方法如 `parseLibraryItem` 和 `getContentType` 也移动到了相应的路由模块中

## 后续扩展

当需要添加新的API功能时，可以：
1. 创建新的路由模块文件
2. 在 `routes/index.ts` 中导出
3. 在 `HttpRouter.ts` 中注册使用

这种结构使得代码更加模块化和易于管理。
