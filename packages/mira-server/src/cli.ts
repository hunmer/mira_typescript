#!/usr/bin/env node

import { MiraBackend } from 'mira-app-core';

// CLI 启动脚本
function main() {
  const args = process.argv.slice(2);
  const options: any = {};

  // 简单的参数解析
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--http-port':
        options.httpPort = parseInt(args[++i]);
        break;
      case '--ws-port':
        options.wsPort = parseInt(args[++i]);
        break;
      case '--data-path':
        options.dataPath = args[++i];
        break;
      case '--help':
        console.log(`
Mira Server CLI

Usage: mira-server [options]

Options:
  --http-port <port>   HTTP server port (default: 3000)
  --ws-port <port>     WebSocket server port (default: 8081)
  --data-path <path>   Data directory path (default: ./data)
  --help               Show this help message
        `);
        process.exit(0);
        break;
    }
  }

  console.log('Starting Mira Server...');
  const server = MiraBackend.createAndStart(options);
  console.log('Mira Server started successfully');
}

if (require.main === module) {
  main();
}
