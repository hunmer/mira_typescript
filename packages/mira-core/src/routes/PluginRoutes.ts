import { Router, Request, Response } from 'express';
import { MiraBackend } from '../MiraBackend';
import * as fs from 'fs';
import * as path from 'path';

export class PluginRoutes {
    private router: Router;
    private backend: MiraBackend;

    constructor(backend: MiraBackend) {
        this.backend = backend;
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // 获取插件列表
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const plugins = [];
                for (const [id, libraryObj] of Object.entries(this.backend.libraries.libraries)) {
                    if (libraryObj.pluginManager) {
                        // 获取该库的插件信息
                        const libraryPlugins = libraryObj.pluginManager.getPluginsList();
                        plugins.push(...libraryPlugins.map((plugin: any) => ({
                            id: `${id}-${plugin.name}`,
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
                for (const [id, libraryObj] of Object.entries(this.backend.libraries.libraries)) {
                    const libraryInfo: any = {
                        id: id,
                        name: id, // 直接使用库ID作为名称
                        description: `素材库: ${id}`,
                        plugins: []
                    };

                    if (libraryObj.pluginManager) {
                        // 获取该库的插件信息
                        const libraryPlugins = libraryObj.pluginManager.getPluginsList();
                        libraryInfo.plugins = libraryPlugins.map((plugin: any) => ({
                            id: `${id}-${plugin.name}`,
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
                const { name, version = 'latest' } = req.body;

                if (!name) {
                    return res.status(400).json({ error: 'Plugin name is required' });
                }

                // 使用npm安装插件到插件目录
                const { spawn } = require('child_process');
                const pluginsDir = path.join(this.backend.dataPath, 'plugins');

                // 确保插件目录存在
                if (!fs.existsSync(pluginsDir)) {
                    fs.mkdirSync(pluginsDir, { recursive: true });
                }

                const packageName = version === 'latest' ? name : `${name}@${version}`;

                const npmProcess = spawn('npm', ['install', packageName], {
                    cwd: pluginsDir,
                    stdio: 'pipe'
                });

                let output = '';
                let errorOutput = '';

                npmProcess.stdout.on('data', (data: Buffer) => {
                    output += data.toString();
                });

                npmProcess.stderr.on('data', (data: Buffer) => {
                    errorOutput += data.toString();
                });

                npmProcess.on('close', async (code: number) => {
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

                            // 为每个库的插件管理器添加新插件
                            for (const [id, libraryObj] of Object.entries(this.backend.libraries.libraries)) {
                                if (libraryObj.pluginManager) {
                                    await libraryObj.pluginManager.addPlugin({
                                        name: name,
                                        enabled: false, // 默认不启用，需要用户手动启用
                                        path: `node_modules/${name}`
                                    });
                                }
                            }

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
                        res.status(500).json({
                            error: 'Failed to install plugin',
                            details: errorOutput
                        });
                    }
                });

            } catch (error) {
                console.error('Error installing plugin:', error);
                res.status(500).json({ error: 'Failed to install plugin' });
            }
        });

        // 插件状态切换
        this.router.patch('/:id/status', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const { status } = req.body;

                const [libraryId, pluginName] = id.split('-', 2);
                const libraryObj = this.backend.libraries.get(libraryId);

                if (!libraryObj || !libraryObj.pluginManager) {
                    return res.status(404).json({ error: 'Library or plugin manager not found' });
                }

                // 更新插件状态
                const pluginsConfigPath = path.join(libraryObj.pluginManager.pluginsDir, 'plugins.json');
                const config = JSON.parse(fs.readFileSync(pluginsConfigPath, 'utf-8'));

                const pluginIndex = config.findIndex((p: any) => p.name === pluginName);
                if (pluginIndex === -1) {
                    return res.status(404).json({ error: 'Plugin not found' });
                }

                config[pluginIndex].enabled = status === 'active';
                fs.writeFileSync(pluginsConfigPath, JSON.stringify(config, null, 2));

                // 重新加载插件
                await libraryObj.pluginManager.loadPlugins();

                res.json({
                    message: `Plugin ${status === 'active' ? 'activated' : 'deactivated'} successfully`
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
                const libraryObj = this.backend.libraries.get(libraryId);

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
                const libraryObj = this.backend.libraries.get(libraryId);

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
                const libraryObj = this.backend.libraries.get(libraryId);

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
                const npmProcess = spawn('npm', ['uninstall', pluginName], {
                    cwd: libraryObj.pluginManager.pluginsDir,
                    stdio: 'pipe'
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
                for (const [id, libraryObj] of Object.entries(this.backend.libraries.libraries)) {
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
