#!/usr/bin/env node
/**
 * Mira SDK 示例运行器
 * 用于运行各种SDK使用示例
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 颜色输出函数
const colors = {
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// 可用的示例
const examples = {
    'auth': {
        file: 'examples/auth/login-example.ts',
        description: '身份认证示例 - 登录、登出、权限验证'
    },
    'upload': {
        file: 'examples/files/upload-example.ts',
        description: '文件上传示例 - 单文件、批量上传、下载'
    },
    'basic': {
        file: 'examples/basic/basic-usage.ts',
        description: '基础使用示例 - 快速开始、库管理、用户管理'
    },
    'advanced': {
        file: 'examples/advanced/chain-operations.ts',
        description: '高级链式操作 - 复杂工作流、错误恢复、并发操作'
    }
};

// 运行单个示例
function runExample(exampleKey) {
    return new Promise((resolve, reject) => {
        const example = examples[exampleKey];
        if (!example) {
            reject(new Error(`示例 "${exampleKey}" 不存在`));
            return;
        }

        const filePath = path.join(__dirname, example.file);

        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            reject(new Error(`示例文件不存在: ${filePath}`));
            return;
        }

        console.log(colors.blue(`\n🚀 运行示例: ${exampleKey}`));
        console.log(colors.gray(`   ${example.description}`));
        console.log(colors.gray(`   文件: ${example.file}`));
        console.log(colors.gray('='.repeat(60)));

        // 使用 ts-node 运行 TypeScript 文件
        const child = spawn('npx', ['ts-node', filePath], {
            stdio: 'inherit',
            cwd: __dirname,
            shell: process.platform === 'win32'
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(colors.green(`\n✅ 示例 "${exampleKey}" 运行完成\n`));
                resolve(code);
            } else {
                console.log(colors.red(`\n❌ 示例 "${exampleKey}" 运行失败 (退出代码: ${code})\n`));
                reject(new Error(`示例运行失败，退出代码: ${code}`));
            }
        });

        child.on('error', (error) => {
            console.error(colors.red(`\n❌ 启动示例失败: ${error.message}\n`));
            reject(error);
        });
    });
}

// 显示帮助信息
function showHelp() {
    console.log(colors.bold(colors.cyan('\n🎯 Mira SDK 示例运行器')));
    console.log('用法: node run-examples.js [示例名称]');
    console.log('\n可用示例:');

    Object.entries(examples).forEach(([key, example]) => {
        console.log(`  ${colors.yellow(key.padEnd(10))} - ${example.description}`);
    });

    console.log('\n特殊命令:');
    console.log(`  ${colors.yellow('all'.padEnd(10))} - 运行所有示例`);
    console.log(`  ${colors.yellow('help'.padEnd(10))} - 显示此帮助信息`);

    console.log('\n示例:');
    console.log('  node run-examples.js auth      # 运行身份认证示例');
    console.log('  node run-examples.js all       # 运行所有示例');
    console.log('  node run-examples.js           # 交互式选择');

    console.log('\n环境变量:');
    console.log('  MIRA_SERVER_URL - 服务器地址 (默认: http://localhost:8081)');
    console.log('  MIRA_USERNAME   - 用户名 (默认: admin)');
    console.log('  MIRA_PASSWORD   - 密码 (默认: admin123)');

    console.log(colors.gray('\n💡 提示: 确保在运行示例前已启动 Mira 服务器'));
}

// 交互式选择示例
async function interactiveSelect() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        console.log(colors.cyan('\n🎯 请选择要运行的示例:'));

        const exampleKeys = Object.keys(examples);
        exampleKeys.forEach((key, index) => {
            console.log(`  ${colors.yellow((index + 1).toString())}. ${key} - ${examples[key].description}`);
        });
        console.log(`  ${colors.yellow((exampleKeys.length + 1).toString())}. all - 运行所有示例`);
        console.log(`  ${colors.yellow((exampleKeys.length + 2).toString())}. exit - 退出`);

        rl.question('\n请输入选项编号或示例名称: ', (answer) => {
            rl.close();

            const num = parseInt(answer);
            if (num >= 1 && num <= exampleKeys.length) {
                resolve(exampleKeys[num - 1]);
            } else if (num === exampleKeys.length + 1) {
                resolve('all');
            } else if (num === exampleKeys.length + 2) {
                resolve('exit');
            } else if (examples[answer]) {
                resolve(answer);
            } else if (answer === 'all') {
                resolve('all');
            } else {
                console.log(colors.red('无效选择，退出...'));
                resolve('exit');
            }
        });
    });
}

// 运行所有示例
async function runAllExamples() {
    console.log(colors.bold(colors.cyan('\n🚀 运行所有示例...\n')));

    const results = {};
    const exampleKeys = Object.keys(examples);

    for (let i = 0; i < exampleKeys.length; i++) {
        const key = exampleKeys[i];
        try {
            console.log(colors.yellow(`\n📋 进度: ${i + 1}/${exampleKeys.length}`));
            await runExample(key);
            results[key] = 'success';
        } catch (error) {
            console.error(colors.red(`示例 "${key}" 失败: ${error.message}`));
            results[key] = 'failed';
        }

        // 在示例之间添加延迟，避免资源冲突
        if (i < exampleKeys.length - 1) {
            console.log(colors.gray('等待 2 秒后继续...'));
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // 显示总结
    console.log(colors.bold(colors.cyan('\n📊 运行总结:')));
    const successful = Object.values(results).filter(r => r === 'success').length;
    const failed = Object.values(results).filter(r => r === 'failed').length;

    console.log(`  ${colors.green('成功:')} ${successful}`);
    console.log(`  ${colors.red('失败:')} ${failed}`);
    console.log(`  ${colors.blue('总计:')} ${successful + failed}`);

    Object.entries(results).forEach(([key, status]) => {
        const icon = status === 'success' ? '✅' : '❌';
        const color = status === 'success' ? colors.green : colors.red;
        console.log(`    ${icon} ${color(key)}`);
    });
}

// 检查环境
function checkEnvironment() {
    console.log(colors.cyan('🔍 检查环境配置...'));

    const serverUrl = process.env.MIRA_SERVER_URL || 'http://localhost:8081';
    const username = process.env.MIRA_USERNAME || 'admin';
    const password = process.env.MIRA_PASSWORD ? '***' : 'admin123 (默认)';

    console.log(`  服务器: ${serverUrl}`);
    console.log(`  用户名: ${username}`);
    console.log(`  密码: ${password}`);

    // 检查必要的依赖
    const packageJson = path.join(__dirname, 'package.json');
    if (!fs.existsSync(packageJson)) {
        console.log(colors.red('❌ 未找到 package.json，请确保在正确的目录中运行'));
        process.exit(1);
    }

    console.log(colors.green('✅ 环境检查完成\n'));
}

// 主函数
async function main() {
    console.log(colors.bold(colors.cyan('🎯 Mira SDK 示例运行器')));
    console.log(colors.gray('='.repeat(40)));

    // 解析命令行参数
    const args = process.argv.slice(2);
    const command = args[0];

    // 检查环境
    checkEnvironment();

    try {
        if (!command) {
            // 交互式模式
            const selection = await interactiveSelect();
            if (selection === 'exit') {
                console.log(colors.yellow('👋 再见!'));
                return;
            } else if (selection === 'all') {
                await runAllExamples();
            } else {
                await runExample(selection);
            }
        } else if (command === 'help' || command === '--help' || command === '-h') {
            showHelp();
        } else if (command === 'all') {
            await runAllExamples();
        } else if (examples[command]) {
            await runExample(command);
        } else {
            console.log(colors.red(`❌ 未知示例: ${command}`));
            showHelp();
            process.exit(1);
        }

        console.log(colors.green('🎉 运行完成!'));

    } catch (error) {
        console.error(colors.red(`💥 运行失败: ${error.message}`));
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    runExample,
    runAllExamples,
    examples
};
