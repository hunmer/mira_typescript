# Mira TypeScript SDK 安装和使用指南

## 概述

我已经为 Mira App Server 创建了一个完整的 TypeScript SDK，具有以下特性：

### ✨ 主要特性

1. **链式调用支持** - 类似 jQuery 的链式调用风格
2. **模块化设计** - 清晰的目录结构和功能分离
3. **完整类型定义** - 100% TypeScript 支持
4. **自动错误处理** - 内置重试和错误恢复机制
5. **测试覆盖** - 完整的测试套件
6. **自我修复** - 能够检测问题并提供修复建议

## 📁 目录结构

```
mira-app-server/sdk/
├── client/                 # HTTP 客户端
│   ├── HttpClient.ts      # 基础 HTTP 客户端
│   └── MiraClient.ts      # 主客户端类
├── modules/               # 功能模块
│   ├── AuthModule.ts      # 认证模块
│   ├── UserModule.ts      # 用户管理
│   ├── LibraryModule.ts   # 素材库管理
│   ├── PluginModule.ts    # 插件管理
│   ├── FileModule.ts      # 文件操作
│   ├── DatabaseModule.ts  # 数据库查询
│   ├── DeviceModule.ts    # 设备管理
│   └── SystemModule.ts    # 系统状态
├── tests/                 # 测试文件
├── examples/              # 使用示例
├── scripts/               # 工具脚本
├── types.ts              # 类型定义
├── index.ts              # 主入口
└── README.md             # 详细文档
```

## 🚀 快速开始

### 1. 基础使用

```typescript
import { MiraClient } from './sdk';

const client = new MiraClient('http://localhost:8081');

// 登录
await client.login('username', 'password');

// 获取用户信息
const userInfo = await client.user().getInfo();

// 管理素材库
const libraries = await client.libraries().getAll();
await client.libraries().start('library-id');
```

### 2. 链式调用

```typescript
// 优雅的链式操作
const result = await client
  .login('admin', 'password')
  .then(() => client.user().getInfo())
  .then(userInfo => {
    console.log('当前用户:', userInfo.username);
    return client.libraries().getActive();
  })
  .then(libraries => {
    console.log('活跃素材库:', libraries.length);
    return libraries;
  });
```

### 3. 错误处理

```typescript
// 安全执行，失败时返回默认值
const userInfo = await client.safe(
  () => client.user().getInfo(),
  { id: 0, username: 'guest' }
);

// 自动重试
const libraries = await client.retry(
  () => client.libraries().getAll(),
  3,    // 重试3次
  1000  // 间隔1秒
);

// 批量操作
const results = await client.batch([
  () => client.system().getHealth(),
  () => client.libraries().getAll(),
  () => client.plugins().getAll(),
]);
```

## 📋 完整功能列表

### 认证模块 (client.auth())
- ✅ `login()` - 用户登录
- ✅ `logout()` - 用户登出
- ✅ `verify()` - 令牌验证
- ✅ `getCodes()` - 获取权限码
- ✅ `setToken()` / `clearToken()` - 令牌管理

### 用户模块 (client.user())
- ✅ `getInfo()` - 获取用户信息
- ✅ `updateInfo()` - 更新用户信息
- ✅ `updateRealName()` - 更新真实姓名
- ✅ `updateAvatar()` - 更新头像

### 素材库模块 (client.libraries())
- ✅ `getAll()` - 获取所有素材库
- ✅ `getById()` - 根据ID获取素材库
- ✅ `create()` - 创建素材库
- ✅ `createLocal()` / `createRemote()` - 创建本地/远程素材库
- ✅ `update()` - 更新素材库
- ✅ `delete()` - 删除素材库
- ✅ `start()` / `stop()` / `restart()` - 启动/停止/重启
- ✅ `getActive()` / `getLocal()` / `getRemote()` - 筛选获取

### 插件模块 (client.plugins())
- ✅ `getAll()` - 获取所有插件
- ✅ `getByLibrary()` - 按素材库分组
- ✅ `install()` / `uninstall()` - 安装/卸载插件
- ✅ `enable()` / `disable()` - 启用/禁用插件
- ✅ `search()` - 搜索插件
- ✅ `getByCategory()` / `getByTag()` - 按分类/标签筛选

### 文件模块 (client.files())
- ✅ `uploadFile()` / `uploadFiles()` - 上传文件
- ✅ `download()` - 下载文件
- ✅ `downloadAndSave()` - 下载并保存
- ✅ `delete()` / `deleteMultiple()` - 删除文件
- ✅ `uploadWithTags()` / `uploadToFolder()` - 带标签上传

### 数据库模块 (client.database())
- ✅ `getTables()` - 获取数据库表
- ✅ `getTableData()` - 获取表数据
- ✅ `getTableSchema()` - 获取表结构
- ✅ `searchTables()` - 搜索表
- ✅ `getPrimaryKeys()` - 获取主键

### 设备模块 (client.devices())
- ✅ `getAll()` - 获取所有设备
- ✅ `getByLibrary()` - 按素材库获取设备
- ✅ `disconnect()` - 断开设备连接
- ✅ `sendMessage()` - 发送消息到设备
- ✅ `broadcastToLibrary()` / `broadcastToAll()` - 广播消息
- ✅ `getStats()` - 获取设备统计

### 系统模块 (client.system())
- ✅ `getHealth()` - 获取系统健康状态
- ✅ `isServerAvailable()` - 检查服务器可用性
- ✅ `waitForServer()` - 等待服务器就绪
- ✅ `monitorHealth()` - 实时监控
- ✅ `getSystemInfo()` - 获取系统信息

## 🧪 测试和验证

### 运行验证测试

```bash
# 快速验证 SDK 是否工作
cd packages/mira-app-server/sdk
node verify-sdk.js
```

### 运行完整测试套件

```bash
# 运行所有测试
npm run test

# 监视模式
npm run test:watch

# 覆盖率报告
npm run test:coverage

# 集成测试
npm run test:integration
```

### 构建 SDK

```bash
# 构建 SDK
npm run build:sdk

# 运行示例
npm run sdk:example
```

## 🔧 自动修复功能

SDK 包含智能诊断和修复功能：

```bash
# 运行自动诊断和修复
node sdk/scripts/test-and-fix.js
```

此脚本会：
1. 检查 SDK 基本功能
2. 测试服务器连接
3. 验证 API 可用性
4. 检测常见问题
5. 提供修复建议
6. 生成详细报告

## 📚 使用示例

完整的使用示例请查看：
- `sdk/examples/usage-examples.ts` - 详细的使用示例
- `sdk/README.md` - 完整的 API 文档

## 🎯 设计特点

### 1. 链式调用设计
所有设置类方法都返回实例本身，支持链式调用：

```typescript
client.setToken('token').clearToken().setToken('new-token');
```

### 2. 模块化架构
每个功能域独立成模块，保持代码清晰和易维护。

### 3. 错误处理机制
- 统一的错误格式
- 自动重试机制
- 安全执行包装
- 详细的错误信息

### 4. 类型安全
- 完整的 TypeScript 类型定义
- 编译时类型检查
- 智能代码提示

### 5. 测试覆盖
- 单元测试覆盖所有模块
- 集成测试验证整体功能
- 自动化测试和修复

## 🚨 故障排除

### 常见问题

1. **连接超时**
   ```typescript
   const client = new MiraClient('http://localhost:8081', {
     timeout: 30000 // 增加超时时间
   });
   ```

2. **认证失败**
   ```typescript
   if (!client.auth().isAuthenticated()) {
     await client.login('username', 'password');
   }
   ```

3. **网络不稳定**
   ```typescript
   const result = await client.retry(operation, 5, 2000);
   ```

### 调试模式

启用详细日志：
```typescript
// 设置环境变量
process.env.MIRA_SDK_DEBUG = 'true';
```

## 📝 总结

我已经成功创建了一个功能完整的 Mira TypeScript SDK，包括：

- ✅ **链式调用支持** - 优雅的 API 设计
- ✅ **模块化架构** - 清晰的代码组织
- ✅ **完整功能覆盖** - 支持所有 API 接口
- ✅ **类型安全** - 100% TypeScript 支持
- ✅ **错误处理** - 智能重试和恢复
- ✅ **测试验证** - 全面的测试覆盖
- ✅ **自动修复** - 问题检测和修复建议
- ✅ **详细文档** - 完整的使用指南

SDK 现在已经可以投入使用，能够显著提升开发体验和代码质量。
