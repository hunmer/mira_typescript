import { MiraServer } from './MiraServer';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量 - 先加载根目录的 .env，再加载本地的 .env
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();

async function startServer() {
  try {
    // 服务端启动文件
    console.log('🚀 Starting Mira Server...');

    // 获取端口配置，优先使用环境变量
    const httpPort = process.env.MIRA_SERVER_HTTP_PORT || process.env.HTTP_PORT || '8081';
    const wsPort = process.env.MIRA_SERVER_WS_PORT || process.env.WS_PORT || '8018';
    const dataPath = process.env.DATA_PATH || './data';

    console.log(`📡 HTTP Server will start on port: ${httpPort}`);
    console.log(`🔌 WebSocket Server will start on port: ${wsPort}`);
    console.log(`📁 Data path: ${dataPath}`);

    const server = await MiraServer.createAndStart({
      httpPort: parseInt(httpPort),
      wsPort: parseInt(wsPort),
      dataPath: dataPath,
    });

    console.log('✅ Mira Server started successfully');

    // 优雅关闭处理
    process.on('SIGINT', async () => {
      console.log('\n📴 Received SIGINT, gracefully shutting down...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n📴 Received SIGTERM, gracefully shutting down...');
      await server.stop();
      process.exit(0);
    });

    return server;

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 导出服务器实例和启动函数
export { MiraServer, startServer };

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  startServer();
}
