/**
 * 文件上传示例
 * 演示如何使用 Mira SDK 进行文件上传操作
 */

import { MiraClient } from 'mira-server-sdk';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

// Node.js File polyfill for upload compatibility
// For Node.js, we'll make our File object work like a readable stream
const { Readable } = require('stream');

class NodeFile extends Readable {
    public buffer: Buffer;
    public name: string;
    public options: { type?: string };
    private _pushed = false;

    constructor(data: Buffer | Array<any> | string, name: string, options: { type?: string } = {}) {
        super();
        this.name = name;
        this.options = options;

        if (Buffer.isBuffer(data)) {
            this.buffer = data;
        } else if (Array.isArray(data)) {
            if (data.length === 0) {
                this.buffer = Buffer.alloc(0);
            } else if (Buffer.isBuffer(data[0])) {
                this.buffer = Buffer.concat(data);
            } else {
                this.buffer = Buffer.from(data.join(''));
            }
        } else if (typeof data === 'string') {
            this.buffer = Buffer.from(data);
        } else {
            this.buffer = Buffer.from(String(data));
        }
    }

    get type() { return this.options.type || 'application/octet-stream'; }
    get size() { return this.buffer.length; }

    _read() {
        if (!this._pushed) {
            this.push(this.buffer);
            this.push(null); // End of stream
            this._pushed = true;
        }
    }

    arrayBuffer() {
        return Promise.resolve(this.buffer.buffer.slice(
            this.buffer.byteOffset,
            this.buffer.byteOffset + this.buffer.byteLength
        ));
    }
}

// Node.js FileList polyfill
class NodeFileList extends Array {
    constructor(...files: any[]) {
        super(...files);
    }

    item(index: number) {
        return this[index] || null;
    }
}

// Node.js FormData polyfill - use form-data package for Node.js
const FormData = require('form-data');

// Make them available globally for SDK compatibility
(global as any).File = NodeFile;
(global as any).FileList = NodeFileList;
(global as any).FormData = FormData;// 加载环境变量
dotenv.config();

const SERVER_URL = process.env.MIRA_SERVER_URL || 'http://localhost:8081';
const USERNAME = process.env.MIRA_USERNAME || 'admin';
const PASSWORD = process.env.MIRA_PASSWORD || 'admin123';
const LIBRARY_ID = process.env.MIRA_LIBRARY_ID || 'default-library';
const DEMO_MODE = process.env.MIRA_DEMO_MODE === 'true' || false;

/**
 * 演示模式包装器 - 当服务器不可用时显示预期行为
 */
async function demoWrapper<T>(operation: () => Promise<T>, description: string, mockResult?: T): Promise<T> {
    if (DEMO_MODE) {
        console.log(chalk.yellow(`[演示模式] ${description}`));
        console.log(chalk.gray('  实际操作被跳过，显示模拟结果'));

        if (mockResult !== undefined) {
            console.log(chalk.green('  ✅ 模拟成功'));
            return mockResult;
        } else {
            console.log(chalk.green('  ✅ 模拟成功 (无返回值)'));
            return undefined as any;
        }
    } else {
        try {
            return await operation();
        } catch (error: any) {
            // 如果是连接错误，提示用户启用演示模式
            if (error.message?.includes('404') || error.message?.includes('ECONNREFUSED') || error.message?.includes('connect')) {
                console.log(chalk.yellow('⚠️  服务器连接失败'));
                console.log(chalk.gray('   提示: 设置环境变量 MIRA_DEMO_MODE=true 可启用演示模式'));
                throw new Error(`服务器连接失败: ${error.message}`);
            }
            throw error;
        }
    }
}

/**
 * 创建测试文件
 */
function createTestFiles(): { [key: string]: string } {
    const testDir = path.join(__dirname, 'test-files');

    // 确保测试目录存在
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }

    const files: { [key: string]: string } = {};

    // 创建文本文件
    const textContent = `测试文本文件
创建时间: ${new Date().toISOString()}
这是一个用于测试 Mira SDK 上传功能的示例文件。

包含多行内容：
- 第一行内容
- 第二行内容  
- 第三行内容

文件大小应该足够小以便快速上传测试。`;

    files.textFile = path.join(testDir, 'test-document.txt');
    fs.writeFileSync(files.textFile, textContent, 'utf8');

    // 创建JSON文件
    const jsonContent = {
        name: 'Test JSON File',
        version: '1.0.0',
        description: 'This is a test JSON file for Mira SDK upload testing',
        timestamp: new Date().toISOString(),
        metadata: {
            fileType: 'json',
            purpose: 'testing',
            size: 'small'
        },
        data: [
            { id: 1, name: 'Item 1', value: 100 },
            { id: 2, name: 'Item 2', value: 200 },
            { id: 3, name: 'Item 3', value: 300 }
        ]
    };

    files.jsonFile = path.join(testDir, 'test-data.json');
    fs.writeFileSync(files.jsonFile, JSON.stringify(jsonContent, null, 2), 'utf8');

    // 创建小型二进制文件 (模拟图片)
    const binaryData = Buffer.alloc(1024, 0);
    for (let i = 0; i < 1024; i++) {
        binaryData[i] = i % 256;
    }

    files.binaryFile = path.join(testDir, 'test-binary.dat');
    fs.writeFileSync(files.binaryFile, binaryData);

    console.log(chalk.green('✅ 测试文件创建完成:'));
    Object.entries(files).forEach(([type, filePath]) => {
        const stats = fs.statSync(filePath);
        console.log(`  ${type}: ${path.basename(filePath)} (${stats.size} bytes)`);
    });

    return files;
}

/**
 * 基本文件上传示例
 */
async function basicUploadExample(client: MiraClient, files: { [key: string]: string }) {
    console.log(chalk.blue('📁 基本文件上传示例'));
    console.log(chalk.gray('='.repeat(50)));

    try {
        // 上传文本文件
        console.log(chalk.yellow('上传文本文件...'));
        const fileBuffer = fs.readFileSync(files.textFile);
        const textFile = new (global as any).File(fileBuffer, path.basename(files.textFile), {
            type: 'text/plain'
        });

        const uploadResult = await client.files().uploadFile(
            textFile,
            LIBRARY_ID,
            {
                sourcePath: '/test/documents',
                tags: ['test', 'document', 'upload-example']
            }
        );

        console.log(chalk.green('✅ 文本文件上传成功:'));
        console.log(`  文件ID: ${(uploadResult as any).fileId || 'N/A'}`);
        console.log(`  文件路径: ${(uploadResult as any).filePath || 'N/A'}`);
        console.log(`  文件大小: ${(uploadResult as any).fileSize || 'N/A'} bytes`);

        return uploadResult;

    } catch (error) {
        console.error(chalk.red('❌ 基本上传失败:'), error);
        throw error;
    }
}

/**
 * 批量文件上传示例
 */
async function batchUploadExample(client: MiraClient, files: { [key: string]: string }) {
    console.log(chalk.blue('\n📦 批量文件上传示例'));
    console.log(chalk.gray('='.repeat(50)));

    try {
        // 准备多个文件
        const fileList: File[] = [];

        // 添加JSON文件
        const jsonBuffer = fs.readFileSync(files.jsonFile);
        const jsonFile = new (global as any).File([jsonBuffer], path.basename(files.jsonFile), {
            type: 'application/json'
        });
        fileList.push(jsonFile);

        // 添加二进制文件
        const binaryBuffer = fs.readFileSync(files.binaryFile);
        const binaryFile = new (global as any).File([binaryBuffer], path.basename(files.binaryFile), {
            type: 'application/octet-stream'
        });
        fileList.push(binaryFile);

        console.log(chalk.yellow(`准备上传 ${fileList.length} 个文件...`));

        // 批量上传
        const uploadRequest = {
            files: fileList,
            libraryId: LIBRARY_ID,
            sourcePath: '/test/batch-upload',
            clientId: 'batch-upload-client',
            fields: {
                category: 'test-files',
                batch: true,
                uploadedBy: 'sdk-example'
            }
        };

        const batchResult = await client.files().upload(uploadRequest);

        console.log(chalk.green('✅ 批量上传成功:'));
        console.log(`  上传的文件数: ${fileList.length}`);
        console.log(`  批次ID: ${(batchResult as any).batchId || 'N/A'}`);

        if ((batchResult as any).results && Array.isArray((batchResult as any).results)) {
            (batchResult as any).results.forEach((result: any, index: number) => {
                console.log(`  文件 ${index + 1}: ${result.fileName} - ${result.status}`);
            });
        }

        return batchResult;

    } catch (error) {
        console.error(chalk.red('❌ 批量上传失败:'), error);
        throw error;
    }
}

/**
 * 高级上传选项示例
 */
async function advancedUploadExample(client: MiraClient, files: { [key: string]: string }) {
    console.log(chalk.blue('\n⚙️  高级上传选项示例'));
    console.log(chalk.gray('='.repeat(50)));

    try {
        // 创建一个新的测试文件用于高级示例
        const advancedContent = `高级上传测试文件
时间戳: ${Date.now()}
随机数: ${Math.random()}

这个文件用于测试高级上传选项，包括：
- 自定义元数据
- 文件夹分组  
- 客户端标识
- 负载数据`;

        const advancedTestFile = path.join(path.dirname(files.textFile), 'advanced-test.txt');
        fs.writeFileSync(advancedTestFile, advancedContent, 'utf8');

        const fileBuffer = fs.readFileSync(advancedTestFile);
        const file = new (global as any).File([fileBuffer], 'advanced-test.txt', {
            type: 'text/plain'
        });

        console.log(chalk.yellow('上传带有高级选项的文件...'));

        const uploadRequest = {
            files: [file],
            libraryId: LIBRARY_ID,
            sourcePath: '/test/advanced',
            clientId: 'advanced-upload-client',
            fields: {
                category: 'advanced-test',
                priority: 'high',
                tags: ['advanced', 'metadata', 'test'],
                author: 'SDK Example',
                description: '这是一个高级上传示例文件'
            },
            payload: {
                data: {
                    tags: ['advanced', 'metadata', 'test']
                }
            }
        };

        const result = await client.files().upload(uploadRequest);

        console.log(chalk.green('✅ 高级上传成功:'));
        console.log(`  文件ID: ${(result as any).fileId || 'N/A'}`);
        console.log(`  处理状态: ${(result as any).status || 'N/A'}`);
        console.log(`  元数据已保存: ${(result as any).metadataSaved ? '是' : '否'}`);

        // 清理临时文件
        fs.unlinkSync(advancedTestFile);

        return result;

    } catch (error) {
        console.error(chalk.red('❌ 高级上传失败:'), error);
        throw error;
    }
}

/**
 * 文件下载示例
 */
async function downloadExample(client: MiraClient, uploadResult: any) {
    console.log(chalk.blue('\n⬇️  文件下载示例'));
    console.log(chalk.gray('='.repeat(50)));

    try {
        if (!uploadResult.fileId) {
            console.log(chalk.yellow('⚠️  跳过下载示例: 没有可用的文件ID'));
            return;
        }

        console.log(chalk.yellow(`下载文件 ID: ${uploadResult.fileId}...`));

        const blob = await client.files().download(LIBRARY_ID, uploadResult.fileId);

        console.log(chalk.green('✅ 文件下载成功:'));
        console.log(`  文件大小: ${blob.size} bytes`);
        console.log(`  文件类型: ${blob.type || 'unknown'}`);

        // 保存下载的文件
        const downloadPath = path.join(__dirname, 'test-files', 'downloaded-file.txt');
        const arrayBuffer = await blob.arrayBuffer();
        fs.writeFileSync(downloadPath, Buffer.from(arrayBuffer));

        console.log(`  已保存到: ${downloadPath}`);

        return blob;

    } catch (error) {
        console.error(chalk.red('❌ 文件下载失败:'), error);
        throw error;
    }
}

/**
 * 错误处理示例
 */
async function errorHandlingExample(client: MiraClient) {
    console.log(chalk.blue('\n⚠️  上传错误处理示例'));
    console.log(chalk.gray('='.repeat(50)));

    // 测试无效库ID
    try {
        console.log(chalk.yellow('测试无效的库ID...'));
        const dummyFile = new (global as any).File(['test'], 'test.txt', { type: 'text/plain' });
        await client.files().uploadFile(dummyFile, 'invalid-library-id');
    } catch (error: any) {
        console.log(chalk.yellow('✅ 正确捕获了无效库ID错误:'), (error as Error).message);
    }

    // 测试空文件上传
    try {
        console.log(chalk.yellow('测试空文件上传...'));
        const emptyFile = new (global as any).File([], 'empty.txt', { type: 'text/plain' });
        await client.files().uploadFile(emptyFile, LIBRARY_ID);
    } catch (error: any) {
        console.log(chalk.yellow('✅ 正确捕获了空文件错误:'), (error as Error).message);
    }

    // 测试过大文件 (如果有限制)
    try {
        console.log(chalk.yellow('测试大文件上传...'));
        const largeData = Buffer.alloc(50 * 1024 * 1024, 'x'); // 50MB
        const largeFile = new (global as any).File([largeData], 'large.txt', { type: 'text/plain' });
        await client.files().uploadFile(largeFile, LIBRARY_ID);
        console.log(chalk.green('✅ 大文件上传成功'));
    } catch (error: any) {
        console.log(chalk.yellow('✅ 大文件上传限制:'), (error as Error).message);
    }
}

/**
 * 清理测试文件
 */
function cleanupTestFiles(files: { [key: string]: string }) {
    console.log(chalk.blue('\n🧹 清理测试文件'));
    console.log(chalk.gray('='.repeat(50)));

    try {
        Object.values(files).forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`删除: ${path.basename(filePath)}`);
            }
        });

        // 删除下载的文件
        const downloadPath = path.join(__dirname, 'test-files', 'downloaded-file.txt');
        if (fs.existsSync(downloadPath)) {
            fs.unlinkSync(downloadPath);
            console.log(`删除: downloaded-file.txt`);
        }

        // 删除测试目录 (如果为空)
        const testDir = path.join(__dirname, 'test-files');
        if (fs.existsSync(testDir)) {
            const remainingFiles = fs.readdirSync(testDir);
            if (remainingFiles.length === 0) {
                fs.rmdirSync(testDir);
                console.log(`删除目录: test-files`);
            }
        }

        console.log(chalk.green('✅ 清理完成'));

    } catch (error) {
        console.error(chalk.red('❌ 清理失败:'), error);
    }
}

/**
 * 主函数
 */
async function main() {
    console.log(chalk.bold.cyan('🚀 Mira SDK 文件上传示例集合\n'));

    let client: MiraClient | undefined;
    let testFiles: { [key: string]: string } | undefined;

    try {
        // 创建客户端并登录
        client = new MiraClient(SERVER_URL);
        console.log(chalk.yellow('登录到服务器...'));
        await client.auth().login(USERNAME, PASSWORD);
        console.log(chalk.green('✅ 登录成功\n'));

        // 创建测试文件
        testFiles = createTestFiles();

        // 执行各种上传示例
        const basicResult = await basicUploadExample(client, testFiles);
        await batchUploadExample(client, testFiles);
        await advancedUploadExample(client, testFiles);
        await downloadExample(client, basicResult);
        await errorHandlingExample(client);

        console.log(chalk.bold.green('\n🎉 所有上传示例执行完成!'));

    } catch (error) {
        console.error(chalk.bold.red('\n💥 示例执行失败:'), error);
        process.exit(1);
    } finally {
        // 清理资源
        if (testFiles) {
            cleanupTestFiles(testFiles);
        }

        if (client) {
            try {
                await client.auth().logout();
                console.log(chalk.green('✅ 已登出'));
            } catch (error) {
                console.error(chalk.yellow('⚠️  登出失败:'), error);
            }
        }
    }
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}

export {
    basicUploadExample,
    batchUploadExample,
    advancedUploadExample,
    downloadExample,
    errorHandlingExample,
    createTestFiles,
    cleanupTestFiles
};
