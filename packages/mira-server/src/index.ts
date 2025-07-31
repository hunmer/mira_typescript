import { MiraBackend } from 'mira-app-core';

// 服务端启动文件
console.log('Starting Mira Server...');

const server = MiraBackend.createAndStart({
  httpPort: process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 3000,
  wsPort: process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8081,
  dataPath: process.env.DATA_PATH
});

console.log('Mira Server started successfully');

export { server };
