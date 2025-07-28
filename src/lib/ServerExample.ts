import { MiraWebsocketServer } from './WebSocketServer';
import { MiraHttpServer } from './HttpServer';
import { LibraryStorage } from './LibraryStorage';

export class MiraBackend {
  webSocketServer: MiraWebsocketServer;
  httpServer: MiraHttpServer;
  libraries: LibraryStorage;

  constructor() {
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

}

const app = new MiraBackend();
