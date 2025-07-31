import { MessageHandler } from './MessageHandler';
import { WebSocket } from 'ws';
import { WebSocketMessage } from '../WebSocketRouter';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraWebsocketServer } from '../WebSocketServer';

export class LibraryHandler extends MessageHandler {
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
      const libraryId =  this.dbService.getLibraryId();
      let result;
      switch(action) {
        case 'open':
          // 初次握手,发送服务器所需字段信息
          this.server.sendToWebsocket(this.ws, { eventName: 'try_connect', data: {
            fields: this.dbService.pluginManager!.fields, // 所有插件所需字段信息
          }});
          break;
        case 'connect':
          // 第二次握手 
          this.server.broadcastPluginEvent('client::before_connect', {
            message: this.message,
            ws: this.ws,
          }).then(async ok => {
            if(ok){
              const data = await this.dbService.getLibraryInfo(); // 获取所有标签，文件夹等信息
              this.server.sendToWebsocket(this.ws, { eventName: 'connected', data: data });
              this.server.broadcastPluginEvent('client::connected', { libraryId });
            }
          });
          break;
        case 'close':
          result = await this.dbService.closeLibrary();
          break;
        default:
          throw new Error(`Unsupported library action: ${action}`);
      }

      this.sendResponse({});
    } catch (err) {
      this.sendError(err instanceof Error ? err.message : 'Library operation failed');
    }
  }
}
