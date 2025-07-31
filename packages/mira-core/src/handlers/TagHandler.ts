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
          const libraryId = this.dbService.getLibraryId();
      
      let result;
      switch(action) {
        case 'file_set':
          var {fileId, tags } = data;
          if(await this.dbService.setFileTags(fileId, tags)){
            result = { fileId, tags, libraryId };
            this.server.broadcastPluginEvent('file::setTag',result);
            this.server.broadcastLibraryEvent(libraryId, 'file::setTag', result);
          }
          break;
        case 'file_get':
          var {fileId} = data;
          result = {tags: await this.dbService.getFileTags(fileId)};
          break;
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
          var {id} = data;
          if(await this.dbService.deleteTag(data.id)){
            result = { id };
            this.server.broadcastPluginEvent('tag::deleted', { id, libraryId });
            this.server.sendToWebsocket(this.ws, { eventName: 'file::deleted', data: {id, libraryId} });
          }
          break;
        default:
          throw new Error(`Unsupported tag action: ${action}`);
      }

      this.sendResponse(result as Record<string, any>);
    } catch (err) {
      this.sendError(err instanceof Error ? err.message : 'Tag operation failed');
    }
  }
}