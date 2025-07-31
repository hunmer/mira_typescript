/**
 * @hunmer/mira_core - Core library for Mira TypeScript project
 * 
 * This is an import-only library. No code is automatically executed when importing.
 * All classes and functions must be explicitly instantiated/called by the consuming code.
 * 
 * @example
 * // Import specific classes/functions as needed
 * import { MiraBackend, MiraWebsocketServer } from '@hunmer/mira_core';
 * 
 * // Create instances manually when needed
 * const backend = new MiraBackend();
 * // or use the static factory method
 * const backend = MiraBackend.createAndStart();
 */

// Core exports for mira_core package
export { ILibraryServerData } from './ILibraryServerData';
export { MiraWebsocketServer } from './WebSocketServer';
export { MiraHttpServer } from './HttpServer';
export { ServerPluginManager, PluginConfig } from './ServerPluginManager';
export { EventArgs, EventSubscription, EventManager } from './event-manager';
export { getLibrarysJson } from './LibraryList';
export { LibraryServerDataSQLite } from './LibraryServerDataSQLite';
export { LibraryStorage } from './LibraryStorage';
export { MessageHandler } from './MessageHandler';
export { ServerPlugin } from './ServerPlugin';
export { HttpRouter } from './HttpRouter';
export { WebSocketRouter, WebSocketMessage } from './WebSocketRouter';
export { MiraBackend } from './ServerExample';

// Re-export types and interfaces
export type * from './ILibraryServerData';
export type * from './event-manager';
export type * from './ServerPluginManager';
export type * from './WebSocketRouter';
