import { MessageHandler } from './MessageHandler';
import { WebSocket, WebSocketServer } from 'ws';
import { WebSocketMessage } from '../WebSocketRouter';
import { LibraryServerDataSQLite } from '../LibraryServerDataSQLite';
import { MiraServer } from '../WebSocketServer';

export class FileHandler extends MessageHandler {
  constructor(
    server: MiraServer,
    dbService: LibraryServerDataSQLite,
    ws: WebSocket,
    message: WebSocketMessage
  ) {
    super(server, dbService, ws, message);
  }

  async handle(): Promise<void> {
    try {
      const { action, payload } = this.message;
      const { data } = payload;
      
      let result;
      switch(action) {
        case 'read':
          result = await this.dbService.queryFile(data.query);
          break;
        case 'create':
          const path = data['path'];
          result = path != null ? await this.dbService.createFileFromPath(path, {}) : await this.dbService.createFile(data);
          this.server.broadcastPluginEvent('file::created', result);
          this.server.sendToWebsocket(this.ws, { event: 'file::uploaded', data: {path} });
          break;
        case 'update':
          result = await this.dbService.updateFile(data.id, data);
          break;
        case 'delete':
          result = await this.dbService.deleteFile(data.id, data.options);
          break;
        default:
          throw new Error(`Unsupported file action: ${action}`);
      }

      this.sendResponse({result});
    } catch (err) {
      this.sendError(err instanceof Error ? err.message : 'File operation failed');
    }
  }
}