
// Core exports for mira_core package
export { MiraWebsocketServer } from './WebSocketServer';
export { MiraHttpServer } from './HttpServer';
export { ServerPluginManager, PluginConfig } from './ServerPluginManager';
export { EventArgs, EventSubscription, EventManager } from './event-manager';
export { getLibrarysJson } from './LibraryList';
// Note: LibraryServerDataSQLite moved to separate package to avoid sqlite3 dependency
export { LibraryStorage } from './LibraryStorage';
export { MessageHandler } from './MessageHandler';
export { ServerPlugin } from './ServerPlugin';
export { HttpRouter } from './HttpRouter';
export { WebSocketRouter, WebSocketMessage } from './WebSocketRouter';
export { MiraBackend } from './MiraBackend';

// Re-export handlers
export { FileHandler } from './handlers/FileHandler';
export { FolderHandler } from './handlers/FolderHandler';
export { LibraryHandler } from './handlers/LibraryHandler';
export { MessageHandler as HandlerMessageHandler } from './handlers/MessageHandler';
export { PluginMessageHandler } from './handlers/PluginMessageHandler';
export { TagHandler } from './handlers/TagHandler';

// Re-export types and interfaces
export type * from './event-manager';
export type * from './ServerPluginManager';
export type * from './WebSocketRouter';
