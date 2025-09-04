#!/usr/bin/env node

import { MiraServer } from './MiraServer';
import { program } from 'commander';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config();

program
  .name('mira-app-server')
  .description('Mira Server - Media Library Management System')
  .version('1.0.17');

program
  .command('start')
  .description('Start the Mira server')
  .option('-p, --http-port <number>', 'HTTP port number', '8081')
  .option('-w, --ws-port <number>', 'WebSocket port number', '8018')
  .option('-d, --data-path <path>', 'Data directory path')
  .option('--env <path>', 'Environment file path')
  .action(async (options) => {
    try {
      // 如果指定了env文件，加载它
      if (options.env) {
        dotenv.config({ path: path.resolve(options.env) });
      }

      console.log('🚀 Starting Mira Server with CLI...');
      console.log('📋 Options:', options);
      console.log('📂 Data path received:', options.dataPath);
      console.log('🔢 Port received:', options.httpPort);
      console.log('🔌 WebSocket port received:', options.wsPort);
      const server = await MiraServer.createAndStart({
        httpPort: parseInt(options.httpPort),
        wsPort: parseInt(options.wsPort),
        dataPath: options.dataPath,
      });

      console.log('✅ Mira Server started via CLI');

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

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  });

program
  .command('version')
  .description('Show version information')
  .action(() => {
    console.log('Mira Server v1.0.0');
    console.log('Node.js', process.version);
    console.log('Platform:', process.platform);
  });

program
  .command('health')
  .description('Check server health')
  .option('-p, --http-port <number>', 'Server port', '8081')
  .action(async (options) => {
    try {
      const axios = await import('axios');
      const response = await axios.default.get(`http://localhost:${options.httpPort}/health`);
      console.log('✅ Server is healthy:', response.data);
    } catch (error) {
      console.error('❌ Server health check failed:', error);
      process.exit(1);
    }
  });

// 解析命令行参数
program.parse(process.argv);

// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
