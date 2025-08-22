import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync, spawn } from 'child_process';

import { MiraServer } from '..';
export class PluginRoutes {
    private router: Router;
    private backend: MiraServer;

    constructor(backend: MiraServer) {
        this.backend = backend;
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // 获取插件列表
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const plugins = [];
                for (const [id, libraryObj] of Object.entries(this.backend.libraries!.getLibraries)) {
                    if (libraryObj.pluginManager) {
                        // 获取该库的插件信息
                        const libraryPlugins = libraryObj.pluginManager.getPluginsList();
                        plugins.push(...libraryPlugins.map((plugin: any) => ({
                            id: id, // 使用纯library ID作为插件ID
                            pluginName: plugin.name, // 单独存储插件名称
                            name: plugin.name,
                            version: plugin.version || '1.0.0',
                            description: plugin.description || '',
                            author: plugin.author || 'Unknown',
                            status: plugin.status || 'active',
                            configurable: plugin.configurable || false,
                            dependencies: plugin.dependencies || [],
                            main: plugin.main || 'index.js',
                            libraryId: id,
                            createdAt: plugin.createdAt || new Date().toISOString(),
                            updatedAt: plugin.updatedAt || new Date().toISOString(),
                            icon: plugin.icon || null,
                            category: plugin.category || 'general',
                            tags: plugin.tags || []
                        })));
                    }
                }
                res.json(plugins);
            } catch (error) {
                console.error('Error getting plugins:', error);
                res.status(500).json({ error: 'Failed to get plugins' });
            }
        });

        // 按素材库分组获取插件列表
        this.router.get('/by-library', async (req: Request, res: Response) => {
            try {
                const librariesWithPlugins = [];
                for (const [id, libraryObj] of Object.entries(this.backend.libraries!.getLibraries())) {
                    const libraryInfo: any = {
                        id: id,
                        name: libraryObj.libraryService?.config.name || id,
                        description: `素材库: ${id}`, // TODO: desc
                        plugins: []
                    };

                    if (libraryObj.pluginManager) {
                        // 获取该库的插件信息
                        const libraryPlugins = libraryObj.pluginManager.getPluginsList();
                        libraryInfo.plugins = libraryPlugins.map((plugin: any) => ({
                            id: id, // 使用纯library ID作为插件ID
                            pluginName: plugin.name, // 单独存储插件名称
                            name: plugin.name,
                            version: plugin.version || '1.0.0',
                            description: plugin.description || '',
                            author: plugin.author || 'Unknown',
                            status: plugin.status || 'active',
                            configurable: plugin.configurable || false,
                            dependencies: plugin.dependencies || [],
                            main: plugin.main || 'index.js',
                            libraryId: id,
                            createdAt: plugin.createdAt || new Date().toISOString(),
                            updatedAt: plugin.updatedAt || new Date().toISOString(),
                            icon: plugin.icon || null,
                            category: plugin.category || 'general',
                            tags: plugin.tags || []
                        }));
                    }

                    librariesWithPlugins.push(libraryInfo);
                }
                res.json(librariesWithPlugins);
            } catch (error) {
                console.error('Error getting plugins by library:', error);
                res.status(500).json({ error: 'Failed to get plugins by library' });
            }
        });

        // 安装插件（从npm）
        this.router.post('/install', async (req: Request, res: Response) => {
            try {
                const { name, version = 'latest', libraryId } = req.body;

                if (!name) {
                    return res.status(400).json({ error: 'Plugin name is required' });
                }
                if (!libraryId) {
                    return res.status(400).json({ error: 'Library ID is required' });
                }

                // 如果指定了库ID，安装到对应库的插件目录
                const library = this.backend.libraries!.getLibrary(libraryId);
                if (!library) {
                    return res.status(400).json({ error: `Library ${libraryId} not found` });
                }

                // 确定插件安装目录
                let pluginsDir = library.pluginManager!.pluginsDir;
                if (!library.pluginManager) {
                    return res.status(400).json({ error: `素材库未初始化，请检查是否被禁用！` });
                }
                // 确保插件目录存在
                if (!fs.existsSync(pluginsDir)) {
                    fs.mkdirSync(pluginsDir, { recursive: true });
                }

                const packageName = version === 'latest' ? name : `${name}@${version}`;

                // 支持通过环境变量设置npm代理
                const env = { ...process.env };
                // 如果设置了 HTTP_PROXY/HTTPS_PROXY 环境变量，则传递给子进程
                // 也支持自定义代理端口（如 127.0.0.1:7890）
                if (!env.HTTP_PROXY && !env.HTTPS_PROXY) {
                    env.HTTP_PROXY = 'http://127.0.0.1:7890';
                    env.HTTPS_PROXY = 'http://127.0.0.1:7890';
                }

                // 初始化npm项目
                spawnSync('npm', ['init', '-y'], {
                    cwd: pluginsDir,
                    stdio: 'pipe',
                    shell: true
                });

                const npmProcess = spawn('npm', ['install', packageName, '-save'], {
                    cwd: pluginsDir,
                    stdio: 'pipe',
                    env,
                    shell: true, // 使用 shell 模式，兼容所有平台
                    timeout: 60000 // 设置超时时间为60秒
                });

                let output = '';
                let errorOutput = '';
                let isTimedOut = false;

                // 设置手动超时处理
                const timeoutId = setTimeout(() => {
                    isTimedOut = true;
                    npmProcess.kill('SIGTERM');
                    console.error('npm install timeout after 60 seconds');
                }, 60000);

                npmProcess.stdout.on('data', (data: Buffer) => {
                    output += data.toString();
                });

                npmProcess.stderr.on('data', (data: Buffer) => {
                    errorOutput += data.toString();
                });

                npmProcess.on('close', async (code: number) => {
                    clearTimeout(timeoutId); // 清除超时定时器

                    if (isTimedOut) {
                        return res.status(500).json({
                            error: 'Plugin installation timeout (60s). Please check your network connection.',
                            details: 'Installation was terminated due to timeout'
                        });
                    }

                    if (code === 0) {
                        try {
                            // 安装成功，添加到插件配置
                            const pluginDir = path.join(pluginsDir, 'node_modules', name);
                            let packageInfo = {};

                            try {
                                const packageJsonPath = path.join(pluginDir, 'package.json');
                                if (fs.existsSync(packageJsonPath)) {
                                    packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                                }
                            } catch (error) {
                                console.error('Error reading package.json:', error);
                            }


                            await library.pluginManager!.addPlugin({
                                name: name,
                                enabled: false, // 默认不启用，需要用户手动启用
                                path: `node_modules/${name}`
                            });

                            res.json({
                                message: 'Plugin installed successfully',
                                plugin: {
                                    name,
                                    version: (packageInfo as any).version || version,
                                    ...packageInfo
                                }
                            });
                        } catch (error) {
                            console.error('Error configuring plugin:', error);
                            res.status(500).json({ error: 'Plugin installed but configuration failed' });
                        }
                    } else {
                        console.error('npm install failed:', errorOutput);

                        // 检查是否是超时错误
                        const isTimeout = errorOutput.includes('timeout') ||
                            errorOutput.includes('ETIMEDOUT') ||
                            (code === null && errorOutput === '');

                        res.status(500).json({
                            error: isTimeout ? 'Plugin installation timeout (60s). Please check your network connection.' : 'Failed to install plugin',
                            details: errorOutput || 'Installation timeout'
                        });
                    }
                });

            } catch (error) {
                console.error('Error installing plugin:', error);
                res.status(500).json({ error: 'Failed to install plugin' });
            }
        });

        // 上传安装插件
        this.router.post('/upload', async (req: Request, res: Response) => {
            try {
                const multer = require('multer');
                const yauzl = require('yauzl');

                // 配置multer用于文件上传
                const storage = multer.memoryStorage();
                const upload = multer({
                    storage: storage,
                    limits: { fileSize: 100 * 1024 * 1024 }, // 限制文件大小为100MB
                    fileFilter: (req: any, file: any, cb: any) => {
                        // 只允许zip和tar.gz文件
                        if (file.mimetype === 'application/zip' ||
                            file.mimetype === 'application/x-zip-compressed' ||
                            file.originalname.endsWith('.zip') ||
                            file.originalname.endsWith('.tar.gz')) {
                            cb(null, true);
                        } else {
                            cb(new Error('只支持 .zip 和 .tar.gz 格式的插件包'), false);
                        }
                    }
                }).single('file');

                // 使用multer处理文件上传
                upload(req, res, async (err: any) => {
                    if (err) {
                        console.error('File upload error:', err);
                        return res.status(400).json({ error: err.message || 'File upload failed' });
                    }

                    const file = (req as any).file; // 修正：使用 req.file 而不是 req.body.file
                    const libraryId = req.body.libraryId;

                    if (!file) {
                        return res.status(400).json({ error: 'No file uploaded' });
                    }
                    if (!libraryId) {
                        return res.status(400).json({ error: 'No library ID provided' });
                    }

                    try {
                        // 确定插件安装目录
                        const library = this.backend.libraries!.getLibrary(libraryId);
                        if (!library) {
                            return res.status(400).json({ error: `Library ${libraryId} not found` });
                        }
                        let pluginsDir = library.pluginManager!.pluginsDir;
                        if (!library.pluginManager) {
                            return res.status(400).json({ error: `素材库未初始化，请检查是否被禁用！` });
                        }
                        // 确保插件目录存在
                        if (!fs.existsSync(pluginsDir)) {
                            fs.mkdirSync(pluginsDir, { recursive: true });
                        }

                        // 创建临时文件
                        const tempFilePath = path.join(pluginsDir, `temp_${Date.now()}_${file.originalname}`);
                        fs.writeFileSync(tempFilePath, file.buffer);

                        let pluginName = '';
                        let packageInfo: any = {};

                        try {
                            if (file.originalname.endsWith('.zip')) {
                                // 处理ZIP文件
                                await new Promise<void>((resolve, reject) => {
                                    yauzl.open(tempFilePath, { lazyEntries: true }, (err: any, zipfile: any) => {
                                        if (err) return reject(err);

                                        zipfile.readEntry();
                                        zipfile.on('entry', (entry: any) => {
                                            if (/\/$/.test(entry.fileName)) {
                                                // 目录
                                                zipfile.readEntry();
                                            } else {
                                                // 文件
                                                const outputPath = path.join(pluginsDir, entry.fileName);
                                                const outputDir = path.dirname(outputPath);

                                                if (!fs.existsSync(outputDir)) {
                                                    fs.mkdirSync(outputDir, { recursive: true });
                                                }

                                                zipfile.openReadStream(entry, (err: any, readStream: any) => {
                                                    if (err) return reject(err);

                                                    const writeStream = fs.createWriteStream(outputPath);
                                                    readStream.pipe(writeStream);

                                                    writeStream.on('finish', () => {
                                                        // 检查是否是package.json文件(暂时不需要)
                                                        // if (entry.fileName.endsWith('package.json') && !entry.fileName.includes('/')) {
                                                        //     try {
                                                        //         packageInfo = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
                                                        //         pluginName = packageInfo.name || path.basename(entry.fileName, '.json');
                                                        //     } catch (e) {
                                                        //         console.warn('Error reading package.json:', e);
                                                        //     }
                                                        // }
                                                        zipfile.readEntry();
                                                    });

                                                    writeStream.on('error', reject);
                                                });
                                            }
                                        });

                                        zipfile.on('end', () => {
                                            resolve();
                                        });

                                        zipfile.on('error', reject);
                                    });
                                });
                            } else {
                                // 暂不支持tar.gz，返回错误
                                throw new Error('目前仅支持 .zip 格式的插件包');
                            }

                            // 删除临时文件
                            if (fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                            }

                            // 如果没有找到插件名称，使用文件名
                            if (!pluginName) {
                                pluginName = path.basename(file.originalname, path.extname(file.originalname));
                            }

                            // 为指定库或所有库的插件管理器添加新插件
                            const library = this.backend.libraries!.getLibrary(libraryId);
                            if (library && library.pluginManager) {
                                await library.pluginManager.addPlugin({
                                    name: pluginName,
                                    enabled: false,
                                    path: 'node_modules/' + pluginName
                                });
                            }

                            res.json({
                                message: '插件上传安装成功',
                                plugin: {
                                    name: pluginName,
                                    version: packageInfo.version || '1.0.0',
                                    ...packageInfo
                                }
                            });

                        } catch (extractError) {
                            // 删除临时文件
                            if (fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                            }
                            throw extractError;
                        }

                    } catch (error) {
                        console.error('Error processing uploaded plugin:', error);
                        res.status(500).json({
                            error: 'Failed to process uploaded plugin',
                            details: (error as Error).message
                        });
                    }
                });

            } catch (error) {
                console.error('Error uploading plugin:', error);
                res.status(500).json({ error: 'Failed to upload plugin' });
            }
        });

        // 插件状态切换 (POST方法，避免URL字符冲突)
        this.router.post('/toggle-status', async (req: Request, res: Response) => {
            try {
                const { libraryId, pluginName, status } = req.body;

                if (!libraryId || !pluginName || !status) {
                    return res.status(400).json({ error: 'Library ID, plugin name and status are required' });
                }

                const libraryObj = this.backend.libraries!.getLibrary(libraryId);

                if (!libraryObj || !libraryObj.pluginManager) {
                    return res.status(404).json({ error: 'Library or plugin manager not found' });
                }

                // 更新插件状态
                const pluginsConfigPath = path.join(libraryObj.pluginManager.pluginsDir, 'plugins.json');
                let config = [];

                try {
                    if (fs.existsSync(pluginsConfigPath)) {
                        config = JSON.parse(fs.readFileSync(pluginsConfigPath, 'utf-8'));
                    }
                } catch (error) {
                    console.error('Error reading plugins config:', error);
                    config = [];
                }

                const pluginIndex = config.findIndex((p: any) => p.name === pluginName);
                if (pluginIndex === -1) {
                    return res.status(404).json({ error: 'Plugin not found in config' });
                }

                config[pluginIndex].enabled = status === 'active';
                config[pluginIndex].status = status;

                // 写回配置文件
                try {
                    fs.writeFileSync(pluginsConfigPath, JSON.stringify(config, null, 2));
                } catch (error) {
                    console.error('Error writing plugins config:', error);
                    return res.status(500).json({ error: 'Failed to update plugin config' });
                }

                // 精确处理插件加载/卸载
                try {
                    if (status === 'active') {
                        // 启用插件：如果未加载则加载，如果已加载则跳过
                        const pluginConfig = { name: pluginName, enabled: true, path: config[pluginIndex].path };
                        await libraryObj.pluginManager.loadPlugin(pluginConfig, false);
                    } else {
                        // 禁用插件：卸载插件
                        libraryObj.pluginManager.unloadPlugin(pluginName);
                    }
                } catch (error) {
                    console.error('Error managing plugin:', error);
                    // 不中断响应，仅记录错误
                }

                res.json({
                    success: true,
                    message: `Plugin ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
                    pluginName: pluginName,
                    status: status
                });
            } catch (error) {
                console.error('Error toggling plugin status:', error);
                res.status(500).json({ error: 'Failed to toggle plugin status' });
            }
        });

        // 获取插件配置
        this.router.get('/:id/config', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const [libraryId, pluginName] = id.split('-', 2);
                const libraryObj = this.backend.libraries!.getLibrary(libraryId);

                if (!libraryObj || !libraryObj.pluginManager) {
                    return res.status(404).json({ error: 'Library or plugin manager not found' });
                }

                const pluginDir = libraryObj.pluginManager.getPluginDir(pluginName);
                const configPath = path.join(pluginDir, 'config.json');

                let config = {};
                if (fs.existsSync(configPath)) {
                    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                }

                res.json(config);
            } catch (error) {
                console.error('Error getting plugin config:', error);
                res.status(500).json({ error: 'Failed to get plugin config' });
            }
        });

        // 更新插件配置
        this.router.put('/:id/config', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const config = req.body;

                const [libraryId, pluginName] = id.split('-', 2);
                const libraryObj = this.backend.libraries!.getLibrary(libraryId);

                if (!libraryObj || !libraryObj.pluginManager) {
                    return res.status(404).json({ error: 'Library or plugin manager not found' });
                }

                const pluginDir = libraryObj.pluginManager.getPluginDir(pluginName);
                const configPath = path.join(pluginDir, 'config.json');

                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

                res.json({ message: 'Plugin config updated successfully' });
            } catch (error) {
                console.error('Error updating plugin config:', error);
                res.status(500).json({ error: 'Failed to update plugin config' });
            }
        });

        // 卸载插件
        this.router.delete('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const [libraryId, pluginName] = id.split('-', 2);
                const libraryObj = this.backend.libraries!.getLibrary(libraryId);

                if (!libraryObj || !libraryObj.pluginManager) {
                    return res.status(404).json({ error: 'Library or plugin manager not found' });
                }

                // 先从配置中移除
                const pluginsConfigPath = path.join(libraryObj.pluginManager.pluginsDir, 'plugins.json');
                const config = JSON.parse(fs.readFileSync(pluginsConfigPath, 'utf-8'));

                const newConfig = config.filter((p: any) => p.name !== pluginName);
                fs.writeFileSync(pluginsConfigPath, JSON.stringify(newConfig, null, 2));

                // 尝试使用npm卸载（如果是npm安装的）
                const { spawn } = require('child_process');
                // 使用 shell 模式执行 npm 命令，兼容所有平台
                const npmProcess = spawn('npm', ['uninstall', pluginName], {
                    cwd: libraryObj.pluginManager.pluginsDir,
                    stdio: 'pipe',
                    shell: true // 使用 shell 模式，兼容所有平台
                });

                npmProcess.on('close', (code: number) => {
                    if (code === 0) {
                        console.log(`Plugin ${pluginName} uninstalled successfully`);
                    } else {
                        console.warn(`Failed to uninstall plugin ${pluginName} via npm`);
                    }
                });

                res.json({ message: 'Plugin uninstalled successfully' });
            } catch (error) {
                console.error('Error uninstalling plugin:', error);
                res.status(500).json({ error: 'Failed to uninstall plugin' });
            }
        });

        // 获取插件图标
        this.router.get('/:pluginName/icon/:filename', async (req: Request, res: Response) => {
            try {
                const { pluginName, filename } = req.params;

                // 查找插件所在的库
                let pluginDir: string | null = null;
                for (const [id, libraryObj] of Object.entries(this.backend.libraries!.getLibraries)) {
                    if (libraryObj.pluginManager) {
                        const testPluginDir = libraryObj.pluginManager.getPluginDir(pluginName);
                        const iconPath = path.join(testPluginDir, filename);
                        if (fs.existsSync(iconPath)) {
                            pluginDir = testPluginDir;
                            break;
                        }
                    }
                }

                if (!pluginDir) {
                    return res.status(404).json({ error: 'Plugin icon not found' });
                }

                const iconPath = path.join(pluginDir, filename);

                // 检查文件是否存在
                if (!fs.existsSync(iconPath)) {
                    return res.status(404).json({ error: 'Icon file not found' });
                }

                // 设置合适的Content-Type
                const ext = path.extname(filename).toLowerCase();
                const mimeTypes: { [key: string]: string } = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.svg': 'image/svg+xml',
                    '.ico': 'image/x-icon'
                };

                const contentType = mimeTypes[ext] || 'application/octet-stream';
                res.setHeader('Content-Type', contentType);
                res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存1天

                // 发送文件
                const fileStream = fs.createReadStream(iconPath);
                fileStream.pipe(res);
            } catch (error) {
                console.error('Error serving plugin icon:', error);
                res.status(500).json({ error: 'Failed to serve plugin icon' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
