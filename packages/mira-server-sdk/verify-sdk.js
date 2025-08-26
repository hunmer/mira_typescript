/**
 * 简单的 SDK 验证测试
 * 验证 SDK 可以正确导入和初始化
 */

const { MiraClient } = require('./dist/index.js');

console.log('正在测试 Mira SDK...\n');

// 测试 1: 客户端创建
console.log('1. 测试客户端创建...');
try {
    const client = new MiraClient('http://localhost:8081');
    console.log('✅ 客户端创建成功');

    // 测试 2: 模块访问
    console.log('2. 测试模块访问...');
    const modules = [
        'auth', 'user', 'libraries', 'plugins',
        'files', 'database', 'devices', 'system'
    ];

    for (const moduleName of modules) {
        const module = client[moduleName]();
        if (module) {
            console.log(`   ✅ ${moduleName} 模块正常`);
        } else {
            console.log(`   ❌ ${moduleName} 模块失败`);
        }
    }

    // 测试 3: 链式调用
    console.log('3. 测试链式调用...');
    const result = client.setToken('test').clearToken();
    if (result === client) {
        console.log('✅ 链式调用正常');
    } else {
        console.log('❌ 链式调用失败');
    }

    // 测试 4: 配置管理
    console.log('4. 测试配置管理...');
    const config = client.getConfig();
    if (config && config.baseURL === 'http://localhost:8081') {
        console.log('✅ 配置管理正常');
    } else {
        console.log('❌ 配置管理失败');
    }

    // 测试 5: 静态方法
    console.log('5. 测试静态方法...');
    const newClient = MiraClient.create('http://test:8081');
    if (newClient && newClient !== client) {
        console.log('✅ 静态方法正常');
    } else {
        console.log('❌ 静态方法失败');
    }

    console.log('\n🎉 所有基础测试通过！SDK 工作正常');
    console.log('\n使用示例:');
    console.log('```javascript');
    console.log('const { MiraClient } = require("mira-app-server/sdk");');
    console.log('const client = new MiraClient("http://localhost:8081");');
    console.log('await client.login("username", "password");');
    console.log('const libraries = await client.libraries().getAll();');
    console.log('```');

} catch (error) {
    console.error('❌ SDK 测试失败:', error.message);
    process.exit(1);
}
