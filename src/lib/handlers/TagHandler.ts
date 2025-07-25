import { MessageHandler } from './MessageHandler';
import { WebSocket } from 'ws';
import { WebSocketMessage } from '../WebSocketRouter';
import { LibraryServerDataSQLite } from '../LibraryServerDataSQLite';
import { MiraWebsocketServer } from '../WebSocketServer';

export class TagHandler extends MessageHandler {
  constructor(
    server: MiraWebsocketServer,
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
        case 'all':
          result = await this.dbService.getAllTags();
          break;
        case 'read':
          result = await this.dbService.queryTag(data.query);
          break;
        case 'create':
          result = await this.dbService.createTag(data);
          break;
        case 'update':
          result = await this.dbService.updateTag(data.id, data);
          break;
        case 'delete':
          result = await this.dbService.deleteTag(data.id);
          break;
        default:
          throw new Error(`Unsupported tag action: ${action}`);
      }

      this.sendResponse({result});
    } catch (err) {
      this.sendError(err instanceof Error ? err.message : 'Tag operation failed');
    }
  }
}