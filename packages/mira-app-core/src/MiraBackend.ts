import { MiraWebsocketServer } from './WebSocketServer';
import { LibraryStorage } from './LibraryStorage';
import * as path from 'path';

export interface MiraBackendOptions {
  dataPath?: string;
  wsPort?: number;
  autoLoad?: boolean;
  autoStart?: boolean;
}

export class MiraBackend {
  webSocketServer?: MiraWebsocketServer;
  libraries: LibraryStorage;
  dataPath: string;

  constructor(options?: MiraBackendOptions) {
    // 确保options有默认值
    const config = options || {};

    console.log('🎯 MiraBackend constructor received options:', JSON.stringify(config, null, 2));

    this.dataPath = config.dataPath || process.env.DATA_PATH || path.join(process.cwd(), 'data');

    console.log('📂 Data path resolved to:', this.dataPath);

    // WebSocket服务器现在是可选的，由外部服务器管理
    if (config.wsPort) {
      console.log('🔌 Initializing WebSocket server on port:', config.wsPort);
      this.webSocketServer = new MiraWebsocketServer(config.wsPort, this);
    }

    this.libraries = new LibraryStorage(this);

    // 只有在明确要求时才自动加载
    if (config.autoLoad !== false) {
      console.log('📚 Auto-loading libraries...');
      this.libraries.loadAll().then((loaded) => console.log(`${loaded} Libraries loaded`));
    }

    // 只有在明确要求时才自动启动
    if (config.autoStart === true) {
      console.log('🚀 Auto-starting backend...');
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
   * 注意：HTTP服务器功能已移动到 mira-app-server 包
   */
  static createAndStart(options?: {
    dataPath?: string,
    httpPort?: number,
    wsPort?: number
  }): MiraBackend {
    console.warn('⚠️ MiraBackend.createAndStart is deprecated. Use MiraServer from mira-app-server package for full server functionality.');
    return new MiraBackend({
      dataPath: options?.dataPath,
      wsPort: options?.wsPort,
      autoLoad: true,
      autoStart: true
    });
  }
}
