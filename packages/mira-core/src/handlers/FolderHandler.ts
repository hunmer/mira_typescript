import { MessageHandler } from './MessageHandler';
import { WebSocket } from 'ws';
import { WebSocketMessage } from '../WebSocketRouter';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraWebsocketServer } from '../WebSocketServer';

export class FolderHandler extends MessageHandler {
  constructor(
    server: MiraWebsocketServer,
    dbService: ILibraryServerData,
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
      switch (action) {
        case 'file_set':
          var { fileId, folder } = data;
          if (await this.dbService.setFileFolder(fileId, folder)) {
            result = { fileId, folder, libraryId };
            this.server.broadcastPluginEvent('file::setFolder', result);
            this.server.broadcastLibraryEvent(libraryId, 'file::setFolder', result);
          }
          break;
        case 'file_get':
          var { fileId } = data;
          result = { folder: await this.dbService.getFileFolder(fileId) };
          break;
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
          var { id } = data;
          if(await this.dbService.deleteFolder(id)){
            result = { id };
            this.server.broadcastPluginEvent('folder::deleted', { id, libraryId });
            this.server.sendToWebsocket(this.ws, { eventName: 'folder::deleted', data: { id, libraryId } });
          }
          break;
        default:
          throw new Error(`Unsupported folder action: ${action}`);
      }

      this.sendResponse(result as Record<string, any>);
    } catch (err) {
      this.sendError(err instanceof Error ? err.message : 'Folder operation failed');
    }
  }
}