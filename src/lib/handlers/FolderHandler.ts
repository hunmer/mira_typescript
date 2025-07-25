import { MessageHandler } from './MessageHandler';
import { WebSocket } from 'ws';
import { WebSocketMessage } from '../WebSocketRouter';
import { LibraryServerDataSQLite } from '../LibraryServerDataSQLite';
import { MiraWebsocketServer } from '../WebSocketServer';

export class FolderHandler extends MessageHandler {
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
          result = await this.dbService.getAllFolders();
          break;
        case 'read':
          result = await this.dbService.queryFolder(data.query);
          break;
        case 'create':
          result = await this.dbService.createFolder(data);
          break;
        case 'update':
          result = await this.dbService.updateFolder(data.id, data);
          break;
        case 'delete':
          result = await this.dbService.deleteFolder(data.id);
          break;
        default:
          throw new Error(`Unsupported folder action: ${action}`);
      }

      this.sendResponse({result});
    } catch (err) {
      this.sendError(err instanceof Error ? err.message : 'Folder operation failed');
    }
  }
}