import { MiraWebsocketServer } from './WebSocketServer';
import { MiraHttpServer } from './HttpServer';
import { LibraryStorage } from './LibraryStorage';
import * as path from 'path';

export class MiraBackend {
  webSocketServer: MiraWebsocketServer;
  httpServer: MiraHttpServer;
  libraries: LibraryStorage;
  dataPath: string;

  constructor() {
    this.dataPath = process.env.DATA_PATH || path.join(process.cwd(), 'data');
    this.libraries = new LibraryStorage(this);
    this.libraries.loadAll().then((loaded) => console.log(`${loaded} Libraries loaded`));
    this.httpServer = new MiraHttpServer(3000, this);
    this.webSocketServer = new MiraWebsocketServer(8081, this);
    this.webSocketServer.start('/ws');

    // 处理退出
    process.on('SIGINT', async () => {
      console.log('Shutting down servers...');
      await this.webSocketServer.stop();
      await this.httpServer.stop();
      process.exit();
    });
  }

  /**
   * 启动服务器的静态方法
   * 使用此方法而不是直接实例化，以避免自动启动
   */
  static createAndStart(): MiraBackend {
    return new MiraBackend();
  }
}
