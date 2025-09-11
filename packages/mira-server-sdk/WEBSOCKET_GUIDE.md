# Mira WebSocket Client 使用指南

Mira SDK 现在包含了 WebSocket 客户端功能，允许您实时接收服务端推送的各种数据和事件。

## 特性

- 🔄 自动重连机制
- 🎯 事件绑定和取消绑定
- 📝 类型安全的 TypeScript 接口
- 🔗 链式调用支持
- 📊 连接状态监控
- 🛡️ 错误处理和异常恢复

## 快速开始

### 1. 基本用法

```typescript
import { MiraClient } from 'mira-server-sdk';

const client = new MiraClient('http://localhost:8081');

// 先进行身份验证
await client.login('username', 'password');

// 创建 WebSocket 客户端
const wsClient = client.websocket(8082, {
    clientId: 'my-client',
    libraryId: 'my-library'
});

// 绑定事件监听器
wsClient.bind('dialog', (data) => {
    console.log('收到对话框事件:', data);
});

// 启动连接
await wsClient.start();
```

### 2. 配置选项

```typescript
const wsClient = client.websocket(8082, {
    clientId: 'unique-client-id',         // 客户端标识
    libraryId: 'library-id',              // 素材库ID
    reconnect: true,                      // 启用自动重连
    reconnectInterval: 5000,              // 重连间隔（毫秒）
    maxReconnectAttempts: 10,             // 最大重连次数
    headers: {                            // 自定义请求头
        'Authorization': 'Bearer token',
        'Custom-Header': 'value'
    }
});
```

## API 参考

### WebSocketClient 方法

#### `start(): Promise<void>`
启动 WebSocket 连接。

```typescript
await wsClient.start();
```

#### `stop(): void`
关闭 WebSocket 连接并停止重连。

```typescript
wsClient.stop();
```

#### `bind(eventName: string, callback: Function): void`
绑定事件监听器。可以为同一事件绑定多个监听器。

```typescript
wsClient.bind('dialog', (data) => {
    console.log('Dialog event:', data);
});

wsClient.bind('fileUpload', (data) => {
    console.log('File upload:', data);
});
```

#### `unbind(eventName: string, callback?: Function): void`
取消事件监听器。如果不提供 callback，则取消该事件的所有监听器。

```typescript
// 取消特定监听器
wsClient.unbind('dialog', specificCallback);

// 取消所有 dialog 事件监听器
wsClient.unbind('dialog');
```

#### `send(message: WebSocketMessage): void`
发送自定义消息到服务器。

```typescript
wsClient.send({
    eventName: 'custom',
    action: 'getData',
    libraryId: 'my-library',
    data: { query: 'SELECT * FROM files' }
});
```

#### `sendPluginMessage(action: string, data: object, requestId?: string): void`
发送插件消息的便捷方法。

```typescript
wsClient.sendPluginMessage('test', {
    message: 'Hello from client',
    timestamp: Date.now()
});
```

#### `isConnectedStatus(): boolean`
检查当前连接状态。

```typescript
if (wsClient.isConnectedStatus()) {
    console.log('WebSocket 已连接');
}
```

#### `onData(callback: (data: any) => void): void`
监听服务器的所有返回消息，接收原始数据。

```typescript
wsClient.onData((data) => {
    console.log('服务器返回数据:', data);
    // 这里可以处理所有服务器返回的消息
});
```

### 事件监听

WebSocket 客户端继承自 EventEmitter，支持以下系统事件：

```typescript
// 连接建立
wsClient.on('connected', () => {
    console.log('WebSocket 连接已建立');
});

// 连接断开
wsClient.on('disconnected', (data) => {
    console.log('WebSocket 连接已断开:', data);
});

// 连接错误
wsClient.on('error', (error) => {
    console.error('WebSocket 错误:', error);
});

// 接收到任何消息
wsClient.on('message', (message) => {
    console.log('收到消息:', message);
});
```

## 服务端事件类型

根据 Mira 服务端的实现，您可以监听以下事件类型：

### 对话框事件
```typescript
wsClient.bind('dialog', (data) => {
    // data.title - 对话框标题
    // data.message - 对话框内容
    // data.url - 相关链接
});
```

### 插件事件
```typescript
wsClient.bind('plugin', (data) => {
    // 处理插件相关事件
});
```

### 文件操作事件
```typescript
wsClient.bind('file', (data) => {
    // 文件上传、下载、删除等事件
});
```

### 标签事件
```typescript
wsClient.bind('tag', (data) => {
    // 标签创建、更新、删除事件
});
```

### 文件夹事件
```typescript
wsClient.bind('folder', (data) => {
    // 文件夹操作事件
});
```

### 素材库事件
```typescript
wsClient.bind('library', (data) => {
    // 素材库状态变化事件
});
```

## 完整示例

```typescript
import { MiraClient } from 'mira-server-sdk';

async function setupWebSocket() {
    const client = new MiraClient('http://localhost:8081');
    
    try {
        // 身份验证
        await client.login('admin', 'password');
        
        // 创建 WebSocket 客户端
        const wsClient = client.websocket(8082, {
            clientId: 'dashboard-client',
            libraryId: 'main-library',
            reconnect: true,
            reconnectInterval: 3000,
            maxReconnectAttempts: 5
        });

        // 设置事件监听器
        wsClient.bind('dialog', handleDialog);
        wsClient.bind('fileUpload', handleFileUpload);
        wsClient.bind('plugin', handlePlugin);

        // 监听所有服务器返回的数据
        wsClient.onData((data) => {
            console.log('服务器返回数据:', data);
            // 可以在这里进行统一的数据处理，比如日志记录
        });

        // 设置连接状态监听
        wsClient.on('connected', () => {
            console.log('WebSocket 已连接');
            // 发送初始化消息
            wsClient.sendPluginMessage('init', {
                clientType: 'dashboard',
                version: '1.0.0'
            });
        });

        wsClient.on('disconnected', (data) => {
            console.log('连接断开:', data);
        });

        wsClient.on('error', (error) => {
            console.error('WebSocket 错误:', error);
        });

        // 启动连接
        await wsClient.start();
        
        return wsClient;
        
    } catch (error) {
        console.error('WebSocket 设置失败:', error);
        throw error;
    }
}

function handleDialog(data: any) {
    // 显示对话框
    alert(`${data.title}: ${data.message}`);
}

function handleFileUpload(data: any) {
    // 更新文件上传进度
    console.log(`文件上传进度: ${data.progress}%`);
}

function handlePlugin(data: any) {
    // 处理插件事件
    console.log('插件事件:', data);
}

// 使用示例
setupWebSocket()
    .then(wsClient => {
        console.log('WebSocket 客户端初始化完成');
        
        // 示例：5秒后发送测试消息
        setTimeout(() => {
            wsClient.sendPluginMessage('ping', {
                timestamp: Date.now()
            });
        }, 5000);
    })
    .catch(error => {
        console.error('初始化失败:', error);
    });
```

## 错误处理

```typescript
try {
    await wsClient.start();
} catch (error) {
    console.error('WebSocket 连接失败:', error);
    // 实施回退策略
}

// 监听运行时错误
wsClient.on('error', (error) => {
    console.error('WebSocket 运行时错误:', error);
    
    // 根据错误类型实施不同的处理策略
    if (error.code === 'ECONNREFUSED') {
        console.log('服务器连接被拒绝，请检查服务器状态');
    }
});
```

## 最佳实践

1. **身份验证**: 在创建 WebSocket 连接之前确保已经通过 HTTP API 进行了身份验证。

2. **错误处理**: 始终为 WebSocket 连接设置错误处理器。

3. **资源清理**: 在应用关闭时调用 `wsClient.stop()` 清理资源。

4. **事件解绑**: 在组件销毁时解绑不需要的事件监听器。

5. **连接状态检查**: 在发送消息前检查连接状态。

```typescript
// 好的做法
if (wsClient.isConnectedStatus()) {
    wsClient.send(message);
} else {
    console.log('WebSocket 未连接，消息将在重连后发送');
    // 可以实现消息队列机制
}
```

## 类型定义

```typescript
interface WebSocketOptions {
    clientId?: string;
    libraryId?: string;
    reconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    headers?: Record<string, string>;
}

interface WebSocketMessage {
    eventName: string;
    data: Record<string, any>;
    requestId?: string;
    action?: string;
    payload?: any;
    libraryId?: string;
}

type WebSocketEventCallback = (data: any) => void;
```
