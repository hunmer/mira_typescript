import { MiraServer } from './WebSocketServer';
import { HttpRouter } from './HttpRouter';
import express from 'express';
import http from 'http';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';

// 创建Express应用
const app = express();
app.use(express.json());

// 创建HTTP路由
const httpRouter = new HttpRouter();
app.use('/api', httpRouter.getRouter());

// 创建HTTP服务器
const server = http.createServer(app);

// 创建WebSocket服务器  
const wsServer = new MiraServer(8081);
wsServer.start('/ws');

// 启动HTTP服务器
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

// 处理退出
process.on('SIGINT', async () => {
  console.log('Shutting down servers...');
  await wsServer.stop();
  await httpRouter.close();
  server.close();
  process.exit();
});