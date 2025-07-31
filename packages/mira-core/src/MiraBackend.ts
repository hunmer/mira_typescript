import { MiraWebsocketServer } from './WebSocketServer';
import { MiraHttpServer } from './HttpServer';
import { LibraryStorage } from './LibraryStorage';
import * as path from 'path';

export class MiraBackend {
  webSocketServer: MiraWebsocketServer;
  httpServer: MiraHttpServer;
  libraries: LibraryStorage;
  dataPath: string;

  constructor(options?: { 
    dataPath?: string, 
    httpPort?: number, 
    wsPort?: number,
    autoLoad?: boolean,
    autoStart?: boolean 
  }) {
    this.dataPath = options?.dataPath || process.env.DATA_PATH || path.join(process.cwd(), 'data');
    this.libraries = new LibraryStorage(this);
    
    // 只有在明确要求时才自动加载
    if (options?.autoLoad !== false) {
      this.libraries.loadAll().then((loaded) => console.log(`${loaded} Libraries loaded`));
    }
    
    this.httpServer = new MiraHttpServer(options?.httpPort || 3000, this);
    this.webSocketServer = new MiraWebsocketServer(options?.wsPort || 8081, this);
    
    // 只有在明确要求时才自动启动
    if (options?.autoStart === true) {
      this.start();
    }
  }

  /**
   * 手动启动服务器
   */
  start(): void {
    this.webSocketServer.start('/ws');
    
    // 处理退出
    process.on('SIGINT', async () => {
      console.log('Shutting down servers...');
      await this.stop();
      process.exit();
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    await this.webSocketServer.stop();
    await this.httpServer.stop();
  }

  /**
   * 创建并启动服务器的静态方法 (向后兼容)
   */
  static createAndStart(options?: { 
    dataPath?: string, 
    httpPort?: number, 
    wsPort?: number 
  }): MiraBackend {
    return new MiraBackend({
      ...options,
      autoLoad: true,
      autoStart: true
    });
  }
}
