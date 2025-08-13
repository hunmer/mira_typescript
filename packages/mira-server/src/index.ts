import { MiraServer } from './MiraServer';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function startServer() {
  try {
    // 服务端启动文件
    console.log('🚀 Starting Mira Server...');

    const server = await MiraServer.createAndStart({
      httpPort: process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 8080,
      wsPort: process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8081,
      dataPath: process.env.DATA_PATH,
      enableHttp: true,
      enableWebSocket: true
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
