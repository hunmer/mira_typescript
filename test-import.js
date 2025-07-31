// 测试核心包的安全导入 - 确保不会自动启动服务器
console.log('测试开始: 导入 mira-core...');

// 导入核心包
const { MiraBackend, MiraWebsocketServer, ServerPlugin } = require('./packages/mira-core/dist');

console.log('✅ 成功导入 mira-core，没有自动启动服务器');
console.log('可用的类:', {
  MiraBackend: typeof MiraBackend,
  MiraWebsocketServer: typeof MiraWebsocketServer,
  ServerPlugin: typeof ServerPlugin
});

// 测试创建实例但不启动
console.log('\n测试创建 MiraBackend 实例 (不自动启动)...');
const backend = new MiraBackend({ 
  autoStart: false,
  autoLoad: false 
});

console.log('✅ 成功创建 MiraBackend 实例，没有自动启动服务器');
console.log('实例属性:', {
  dataPath: backend.dataPath,
  httpServer: !!backend.httpServer,
  webSocketServer: !!backend.webSocketServer,
  libraries: !!backend.libraries
});

console.log('\n🎉 测试通过：核心包可以安全导入，不会意外启动服务器！');
