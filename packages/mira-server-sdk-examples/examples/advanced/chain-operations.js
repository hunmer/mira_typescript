"use strict";
/**
 * 高级链式操作示例
 * 演示复杂的链式调用和错误处理模式
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.complexWorkflowExample = complexWorkflowExample;
exports.errorRecoveryChainExample = errorRecoveryChainExample;
exports.concurrentOperationsExample = concurrentOperationsExample;
exports.conditionalChainExample = conditionalChainExample;
const mira_server_sdk_1 = require("mira-server-sdk");
const dotenv = __importStar(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
// 加载环境变量
dotenv.config();
const SERVER_URL = process.env.MIRA_SERVER_URL || 'http://localhost:8081';
const USERNAME = process.env.MIRA_USERNAME || 'admin';
const PASSWORD = process.env.MIRA_PASSWORD || 'admin123';
/**
 * 复杂工作流示例
 * 展示登录 -> 创建素材库 -> 启动服务 -> 上传文件 -> 验证的完整流程
 */
async function complexWorkflowExample() {
    console.log(chalk_1.default.blue('🔗 复杂工作流链式操作示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
    try {
        const workflowResult = await client
            .auth()
            .login(USERNAME, PASSWORD)
            .then(async (loginResult) => {
            console.log(chalk_1.default.green('✅ 步骤1: 登录成功'));
            console.log(`  令牌: ${loginResult.accessToken.substring(0, 20)}...`);
            // 获取用户信息
            const userInfo = await client.user().getInfo();
            console.log(`  用户: ${userInfo.username} (${userInfo.realName})`);
            return { login: loginResult, user: userInfo };
        })
            .then(async (context) => {
            console.log(chalk_1.default.yellow('📚 步骤2: 管理素材库...'));
            // 获取素材库列表
            const libraries = await client.libraries().getAll();
            console.log(chalk_1.default.green(`✅ 找到 ${libraries.length} 个素材库`));
            // 选择第一个素材库进行操作
            let targetLibrary = null;
            if (libraries.length > 0) {
                targetLibrary = libraries[0];
                console.log(`  选择库: ${targetLibrary.name} (${targetLibrary.status})`);
                // 如果库未激活，尝试启动
                if (targetLibrary.status === 'inactive') {
                    console.log(chalk_1.default.yellow('  启动素材库服务...'));
                    try {
                        await client.libraries().start(targetLibrary.id);
                        console.log(chalk_1.default.green('  ✅ 素材库启动成功'));
                    }
                    catch (error) {
                        console.log(chalk_1.default.orange(`  ⚠️  启动失败: ${error.message}`));
                    }
                }
                // 获取库统计信息
                try {
                    const stats = await client.libraries().getStats(targetLibrary.id);
                    console.log(`  统计: ${stats.totalFiles || 0} 文件, ${stats.totalSize || 0} bytes`);
                }
                catch (error) {
                    console.log(chalk_1.default.orange(`  ⚠️  统计获取失败: ${error.message}`));
                }
            }
            return { ...context, libraries, targetLibrary };
        })
            .then(async (context) => {
            console.log(chalk_1.default.yellow('📁 步骤3: 文件操作...'));
            if (!context.targetLibrary) {
                console.log(chalk_1.default.orange('  ⚠️  跳过文件操作: 没有可用的素材库'));
                return context;
            }
            // 创建测试文件
            const testContent = `高级工作流测试文件
用户: ${context.user.username}
库: ${context.targetLibrary.name}
时间: ${new Date().toISOString()}
工作流ID: ${Math.random().toString(36).substring(2)}`;
            const testFile = new File([testContent], 'workflow-test.txt', {
                type: 'text/plain'
            });
            try {
                console.log(chalk_1.default.yellow('  上传测试文件...'));
                const uploadResult = await client.files().uploadFile(testFile, context.targetLibrary.id, {
                    sourcePath: '/workflow-test',
                    tags: ['workflow', 'test', 'advanced'],
                    clientId: 'advanced-workflow'
                });
                console.log(chalk_1.default.green('  ✅ 文件上传成功'));
                console.log(`    文件ID: ${uploadResult.fileId || 'N/A'}`);
                return { ...context, uploadResult };
            }
            catch (error) {
                console.log(chalk_1.default.red(`  ❌ 文件上传失败: ${error.message}`));
                return { ...context, uploadError: error };
            }
        })
            .then(async (context) => {
            console.log(chalk_1.default.yellow('🔍 步骤4: 验证和清理...'));
            // 验证用户权限
            const permissions = await client.auth().getCodes();
            console.log(chalk_1.default.green(`✅ 用户权限验证: ${permissions.length} 个权限`));
            // 获取系统信息
            try {
                const systemInfo = await client.system().getInfo();
                console.log(chalk_1.default.green(`✅ 系统信息: v${systemInfo.version}`));
            }
            catch (error) {
                console.log(chalk_1.default.orange(`⚠️  系统信息获取失败: ${error.message}`));
            }
            // 工作流总结
            const summary = {
                user: context.user.username,
                librariesCount: context.libraries.length,
                targetLibrary: context.targetLibrary?.name || 'N/A',
                uploadSuccess: !!context.uploadResult,
                permissions: permissions.length,
                timestamp: new Date().toISOString()
            };
            console.log(chalk_1.default.green('✅ 工作流完成总结:'));
            console.log(JSON.stringify(summary, null, 2));
            return summary;
        })
            .catch(async (error) => {
            console.error(chalk_1.default.red('❌ 工作流执行失败:'), error);
            // 尝试获取用户信息以进行错误分析
            try {
                const userInfo = await client.user().getInfo();
                console.log(`  当前用户: ${userInfo.username}`);
            }
            catch (e) {
                console.log('  无法获取用户信息，可能未登录');
            }
            throw error;
        })
            .finally(async () => {
            // 确保清理资源
            try {
                await client.auth().logout();
                console.log(chalk_1.default.green('✅ 清理完成: 已登出'));
            }
            catch (error) {
                console.log(chalk_1.default.yellow('⚠️  登出时出现错误'));
            }
        });
        return workflowResult;
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 复杂工作流失败:'), error);
        throw error;
    }
}
/**
 * 错误恢复链示例
 * 展示如何在链式调用中处理错误并进行恢复
 */
async function errorRecoveryChainExample() {
    console.log(chalk_1.default.blue('\n🛠️  错误恢复链示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
    try {
        const result = await client
            .auth()
            .login(USERNAME, PASSWORD)
            .then(async () => {
            console.log(chalk_1.default.green('✅ 登录成功'));
            // 故意触发一些错误来演示恢复机制
            const operations = [
                {
                    name: '获取不存在的素材库',
                    operation: () => client.libraries().getById('non-existent-id'),
                    fallback: () => client.libraries().getAll()
                },
                {
                    name: '访问受限的系统配置',
                    operation: () => client.system().getConfig(),
                    fallback: () => client.system().getInfo()
                },
                {
                    name: '上传到无效库',
                    operation: () => {
                        const dummyFile = new File(['test'], 'test.txt', { type: 'text/plain' });
                        return client.files().uploadFile(dummyFile, 'invalid-library');
                    },
                    fallback: () => client.libraries().getAll()
                }
            ];
            const results = [];
            for (const op of operations) {
                console.log(chalk_1.default.yellow(`尝试: ${op.name}...`));
                try {
                    const result = await op.operation();
                    console.log(chalk_1.default.green(`✅ ${op.name} 成功`));
                    results.push({ operation: op.name, success: true, result });
                }
                catch (error) {
                    console.log(chalk_1.default.orange(`⚠️  ${op.name} 失败: ${error.message}`));
                    console.log(chalk_1.default.yellow(`  尝试降级操作...`));
                    try {
                        const fallbackResult = await op.fallback();
                        console.log(chalk_1.default.green(`✅ 降级操作成功`));
                        results.push({
                            operation: op.name,
                            success: false,
                            fallbackSuccess: true,
                            result: fallbackResult
                        });
                    }
                    catch (fallbackError) {
                        console.log(chalk_1.default.red(`❌ 降级操作也失败: ${fallbackError.message}`));
                        results.push({
                            operation: op.name,
                            success: false,
                            fallbackSuccess: false,
                            error: fallbackError.message
                        });
                    }
                }
            }
            return results;
        });
        console.log(chalk_1.default.green('\n✅ 错误恢复链执行完成'));
        console.log('最终结果:');
        result.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.operation}: ${item.success ? '成功' : (item.fallbackSuccess ? '降级成功' : '失败')}`);
        });
        await client.auth().logout();
        return result;
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 错误恢复链失败:'), error);
        throw error;
    }
}
/**
 * 并发操作链示例
 * 展示如何在链式调用中进行并发操作
 */
async function concurrentOperationsExample() {
    console.log(chalk_1.default.blue('\n⚡ 并发操作链示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
    try {
        const result = await client
            .auth()
            .login(USERNAME, PASSWORD)
            .then(async () => {
            console.log(chalk_1.default.green('✅ 登录成功'));
            console.log(chalk_1.default.yellow('启动并发操作...'));
            const startTime = Date.now();
            // 并发执行多个独立操作
            const concurrentOps = await Promise.allSettled([
                client.user().getInfo(),
                client.libraries().getAll(),
                client.auth().getCodes(),
                client.system().getInfo().catch(() => ({ version: 'unknown' })),
                // 添加一些延迟操作来模拟真实场景
                new Promise(resolve => setTimeout(() => resolve({ delayed: true, timestamp: Date.now() }), 1000))
            ]);
            const endTime = Date.now();
            const duration = endTime - startTime;
            console.log(chalk_1.default.green(`✅ 并发操作完成，耗时: ${duration}ms`));
            // 分析结果
            const results = {
                userInfo: null,
                libraries: [],
                permissions: [],
                systemInfo: null,
                delayedOp: null,
                successful: 0,
                failed: 0,
                duration
            };
            concurrentOps.forEach((result, index) => {
                const opNames = ['用户信息', '素材库列表', '权限码', '系统信息', '延迟操作'];
                if (result.status === 'fulfilled') {
                    console.log(chalk_1.default.green(`  ✅ ${opNames[index]}: 成功`));
                    results.successful++;
                    // 分配结果到相应字段
                    switch (index) {
                        case 0:
                            results.userInfo = result.value;
                            break;
                        case 1:
                            results.libraries = result.value;
                            break;
                        case 2:
                            results.permissions = result.value;
                            break;
                        case 3:
                            results.systemInfo = result.value;
                            break;
                        case 4:
                            results.delayedOp = result.value;
                            break;
                    }
                }
                else {
                    console.log(chalk_1.default.red(`  ❌ ${opNames[index]}: ${result.reason?.message || '失败'}`));
                    results.failed++;
                }
            });
            console.log(chalk_1.default.cyan(`\n📊 并发操作统计:`));
            console.log(`  成功: ${results.successful}`);
            console.log(`  失败: ${results.failed}`);
            console.log(`  总时间: ${results.duration}ms`);
            console.log(`  平均每操作: ${Math.round(results.duration / concurrentOps.length)}ms`);
            return results;
        });
        await client.auth().logout();
        return result;
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 并发操作链失败:'), error);
        throw error;
    }
}
/**
 * 条件链示例
 * 根据条件动态构建操作链
 */
async function conditionalChainExample() {
    console.log(chalk_1.default.blue('\n🔀 条件链示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
    try {
        const result = await client
            .auth()
            .login(USERNAME, PASSWORD)
            .then(async () => {
            console.log(chalk_1.default.green('✅ 登录成功'));
            // 获取用户信息以确定后续操作
            const userInfo = await client.user().getInfo();
            console.log(`用户角色: ${userInfo.roles.join(', ')}`);
            const isAdmin = userInfo.roles.includes('admin') || userInfo.roles.includes('Administrator');
            const operations = { userInfo, operations: [] };
            if (isAdmin) {
                console.log(chalk_1.default.yellow('检测到管理员权限，执行管理员操作...'));
                try {
                    const admins = await client.user().getAdmins();
                    console.log(chalk_1.default.green(`✅ 获取管理员列表: ${admins.length} 个`));
                    operations.operations.push('管理员列表');
                }
                catch (error) {
                    console.log(chalk_1.default.orange(`⚠️  管理员列表获取失败: ${error.message}`));
                }
                try {
                    const systemStatus = await client.system().getStatus();
                    console.log(chalk_1.default.green('✅ 获取系统状态'));
                    operations.operations.push('系统状态');
                }
                catch (error) {
                    console.log(chalk_1.default.orange(`⚠️  系统状态获取失败: ${error.message}`));
                }
            }
            else {
                console.log(chalk_1.default.yellow('普通用户，执行基本操作...'));
            }
            // 所有用户都可以执行的操作
            try {
                const libraries = await client.libraries().getAll();
                console.log(chalk_1.default.green(`✅ 获取素材库列表: ${libraries.length} 个`));
                operations.operations.push('素材库列表');
                // 如果有素材库，尝试获取第一个的详情
                if (libraries.length > 0) {
                    const firstLib = libraries[0];
                    try {
                        const libDetail = await client.libraries().getById(firstLib.id);
                        console.log(chalk_1.default.green(`✅ 获取库详情: ${libDetail.name}`));
                        operations.operations.push('库详情');
                    }
                    catch (error) {
                        console.log(chalk_1.default.orange(`⚠️  库详情获取失败: ${error.message}`));
                    }
                }
            }
            catch (error) {
                console.log(chalk_1.default.red(`❌ 基本操作失败: ${error.message}`));
            }
            return operations;
        });
        console.log(chalk_1.default.green('\n✅ 条件链执行完成'));
        console.log(`执行的操作: ${result.operations.join(', ')}`);
        await client.auth().logout();
        return result;
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 条件链失败:'), error);
        throw error;
    }
}
/**
 * 主函数
 */
async function main() {
    console.log(chalk_1.default.bold.cyan('🚀 Mira SDK 高级链式操作示例集合\n'));
    try {
        await complexWorkflowExample();
        await errorRecoveryChainExample();
        await concurrentOperationsExample();
        await conditionalChainExample();
        console.log(chalk_1.default.bold.green('\n🎉 所有高级示例执行完成!'));
    }
    catch (error) {
        console.error(chalk_1.default.bold.red('\n💥 示例执行失败:'), error);
        process.exit(1);
    }
}
// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=chain-operations.js.map