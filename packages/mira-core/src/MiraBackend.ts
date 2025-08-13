import { MiraWebsocketServer } from './WebSocketServer';
import { LibraryStorage } from './LibraryStorage';
import * as path from 'path';

export class MiraBackend {
  webSocketServer?: MiraWebsocketServer;
  libraries: LibraryStorage;
  dataPath: string;

  constructor(options?: {
    dataPath?: string,
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

    // WebSocket服务器现在是可选的，由外部服务器管理
    if (options?.wsPort) {
      this.webSocketServer = new MiraWebsocketServer(options.wsPort, this);
    }

    // 只有在明确要求时才自动启动
    if (options?.autoStart === true) {
      this.start();
    }
  }

  /**
   * 手动启动服务器
   */
  start(): void {
    if (this.webSocketServer) {
      this.webSocketServer.start('/ws');
      console.log('📡 WebSocket server started');
    }

    // 处理退出
    process.on('SIGINT', async () => {
      console.log('Shutting down backend...');
      await this.stop();
      process.exit();
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    if (this.webSocketServer) {
      await this.webSocketServer.stop();
    }
    console.log('🔄 Backend shutdown completed');
  }

  /**
   * 获取数据路径
   */
  getDataPath(): string {
    return this.dataPath;
  }

  /**
   * 获取库存储实例
   */
  getLibraries(): LibraryStorage {
    return this.libraries;
  }

  /**
   * 创建并启动服务器的静态方法 (向后兼容)
   * 注意：HTTP服务器功能已移动到 mira-server 包
   */
  static createAndStart(options?: {
    dataPath?: string,
    httpPort?: number,
    wsPort?: number
  }): MiraBackend {
    console.warn('⚠️ MiraBackend.createAndStart is deprecated. Use MiraServer from mira-server package for full server functionality.');
    return new MiraBackend({
      dataPath: options?.dataPath,
      wsPort: options?.wsPort,
      autoLoad: true,
      autoStart: true
    });
  }
}
