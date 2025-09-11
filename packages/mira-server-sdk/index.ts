/**
 * Mira App Server TypeScript SDK
 * 
 * 提供链式调用的 TypeScript SDK，用于与 Mira App Server API 交互
 * 
 * @example
 * ```typescript
 * import { MiraClient } from './sdk';
 * 
 * const client = new MiraClient('http://localhost:8081');
 * 
 * // 链式调用示例
 * const result = await client
 *   .auth()
 *   .login('username', 'password')
 *   .then(() => client.libraries().getAll())
 *   .then(libraries => console.log(libraries));
 * ```
 */

export { MiraClient } from './src/client/MiraClient';
export { WebSocketClient } from './src/client/WebSocketClient';
export { AuthModule } from './src/modules/AuthModule';
export { UserModule } from './src/modules/UserModule';
export { LibraryModule } from './src/modules/LibraryModule';
export { PluginModule } from './src/modules/PluginModule';
export { FileModule } from './src/modules/FileModule';
export { DatabaseModule } from './src/modules/DatabaseModule';
export { DeviceModule } from './src/modules/DeviceModule';
export { SystemModule } from './src/modules/SystemModule';
export { TagModule } from './src/modules/TagModule';
export { FolderModule } from './src/modules/FolderModule';

// 导出类型定义
export * from './src/types';
export type { WebSocketOptions, WebSocketMessage, WebSocketEventCallback } from './src/types';
