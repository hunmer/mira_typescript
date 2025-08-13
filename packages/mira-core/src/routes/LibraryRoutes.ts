import { Router, Request, Response } from 'express';
import { MiraBackend } from '../MiraBackend';
import * as fs from 'fs';
import * as path from 'path';

export class LibraryRoutes {
    private router: Router;
    private backend: MiraBackend;

    constructor(backend: MiraBackend) {
        this.backend = backend;
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // 获取资源库列表
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const libraries = [];
                for (const [id, libraryObj] of Object.entries(this.backend.libraries.libraries)) {
                    if (libraryObj.libraryService) {
                        const stats = await libraryObj.libraryService.getStats();
                        // 处理路径字段，兼容新旧配置格式
                        const configPath = libraryObj.libraryService.config.path ||
                            libraryObj.libraryService.config.customFields?.path || '';
                        libraries.push({
                            id: id,
                            name: libraryObj.libraryService.config.name,
                            path: configPath,
                            type: libraryObj.libraryService.config.type || 'local',
                            status: 'active',
                            fileCount: stats.totalFiles,
                            size: stats.totalSize,
                            description: libraryObj.libraryService.config.description || '',
                            createdAt: libraryObj.libraryService.config.createdAt || new Date().toISOString(),
                            updatedAt: libraryObj.libraryService.config.updatedAt || new Date().toISOString()
                        });
                    }
                }
                res.json(libraries);
            } catch (error) {
                console.error('Error getting libraries:', error);
                res.status(500).json({ error: 'Failed to get libraries' });
            }
        });

        // 创建新资源库
        this.router.post('/', async (req: Request, res: Response) => {
            try {
                const { name, path: libraryPath, type, description } = req.body;

                if (!name || !libraryPath) {
                    return res.status(400).json({ error: 'Name and path are required' });
                }

                // 检查路径是否已存在
                for (const [id, libraryObj] of Object.entries(this.backend.libraries.libraries)) {
                    if (libraryObj.libraryService && libraryObj.libraryService.config.path === libraryPath) {
                        return res.status(400).json({ error: 'Library with this path already exists' });
                    }
                }

                // 生成新的 ID
                const newId = Date.now().toString();

                // 创建库配置
                const libraryConfig = {
                    id: newId,
                    name,
                    path: libraryPath,
                    type: type || 'local',
                    description: description || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // 读取现有的 librarys.json
                const fsPromises = require('fs').promises;
                const librarysPath = path.join(this.backend.dataPath, 'librarys.json');

                let libraries = [];
                try {
                    const data = await fsPromises.readFile(librarysPath, 'utf8');
                    libraries = JSON.parse(data);
                } catch (error) {
                    // 文件不存在，使用空数组
                    libraries = [];
                }

                // 添加新库到配置
                libraries.push(libraryConfig);

                // 写回文件
                await fsPromises.writeFile(librarysPath, JSON.stringify(libraries, null, 2), 'utf8');

                // 加载新库
                try {
                    await this.backend.libraries.load(libraryConfig);
                } catch (loadError) {
                    console.warn('Failed to load new library immediately:', loadError);
                }

                // 返回创建的库信息
                const createdLibrary = {
                    id: newId,
                    name,
                    path: libraryPath,
                    type: type || 'local',
                    status: 'active',
                    fileCount: 0,
                    size: 0,
                    description: description || '',
                    createdAt: libraryConfig.createdAt,
                    updatedAt: libraryConfig.updatedAt
                };

                res.status(201).json(createdLibrary);
            } catch (error) {
                console.error('Error creating library:', error);
                res.status(500).json({ error: 'Failed to create library' });
            }
        });

        // 更新资源库
        this.router.put('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const { name, path: libraryPath, type, description } = req.body;

                const libraryObj = this.backend.libraries.get(id);
                if (!libraryObj || !libraryObj.libraryService) {
                    return res.status(404).json({ error: 'Library not found' });
                }

                // 如果路径变了，检查新路径是否与其他库冲突
                if (libraryPath && libraryPath !== libraryObj.libraryService.config.path) {
                    for (const [otherId, otherLibraryObj] of Object.entries(this.backend.libraries.libraries)) {
                        if (otherId !== id && otherLibraryObj.libraryService && otherLibraryObj.libraryService.config.path === libraryPath) {
                            return res.status(400).json({ error: 'Library with this path already exists' });
                        }
                    }
                }

                // 更新配置
                const updatedConfig = {
                    ...libraryObj.libraryService.config,
                    name: name || libraryObj.libraryService.config.name,
                    path: libraryPath || libraryObj.libraryService.config.path,
                    type: type || libraryObj.libraryService.config.type,
                    description: description !== undefined ? description : libraryObj.libraryService.config.description,
                    updatedAt: new Date().toISOString()
                };

                // 更新内存中的配置
                libraryObj.libraryService.config = updatedConfig;

                // 同时更新 librarys.json 文件
                const fsPromises = require('fs').promises;
                const librarysPath = path.join(this.backend.dataPath, 'librarys.json');

                try {
                    const data = await fsPromises.readFile(librarysPath, 'utf8');
                    let libraries = JSON.parse(data);

                    // 找到并更新对应的库配置
                    const libraryIndex = libraries.findIndex((lib: any) => lib.id === id);
                    if (libraryIndex !== -1) {
                        libraries[libraryIndex] = updatedConfig;
                        await fsPromises.writeFile(librarysPath, JSON.stringify(libraries, null, 2), 'utf8');
                    }
                } catch (fileError) {
                    console.warn('Failed to update librarys.json:', fileError);
                }

                // 获取更新后的统计信息
                const stats = await libraryObj.libraryService.getStats();

                const updatedLibrary = {
                    id: id,
                    name: updatedConfig.name,
                    path: updatedConfig.path,
                    type: updatedConfig.type,
                    status: 'active',
                    fileCount: stats.totalFiles,
                    size: stats.totalSize,
                    description: updatedConfig.description || '',
                    createdAt: updatedConfig.createdAt,
                    updatedAt: updatedConfig.updatedAt
                };

                res.json(updatedLibrary);
            } catch (error) {
                console.error('Error updating library:', error);
                res.status(500).json({ error: 'Failed to update library' });
            }
        });

        // 切换资源库状态
        this.router.patch('/:id/status', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const { status } = req.body;

                if (!status || !['active', 'inactive'].includes(status)) {
                    return res.status(400).json({ error: 'Invalid status. Must be active or inactive' });
                }

                const libraryObj = this.backend.libraries.get(id);
                if (!libraryObj || !libraryObj.libraryService) {
                    return res.status(404).json({ error: 'Library not found' });
                }

                // 更新状态（这里我们只是模拟，实际实现可能需要启用/禁用库服务）
                libraryObj.libraryService.config.status = status;
                libraryObj.libraryService.config.updatedAt = new Date().toISOString();

                res.json({ message: `Library ${status === 'active' ? 'activated' : 'deactivated'} successfully` });
            } catch (error) {
                console.error('Error toggling library status:', error);
                res.status(500).json({ error: 'Failed to toggle library status' });
            }
        });

        // 删除资源库
        this.router.delete('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;

                const libraryObj = this.backend.libraries.get(id);
                if (!libraryObj) {
                    return res.status(404).json({ error: 'Library not found' });
                }

                // 读取现有的 librarys.json
                const fsPromises = require('fs').promises;
                const librarysPath = path.join(this.backend.dataPath, 'librarys.json');

                let libraries = [];
                try {
                    const data = await fsPromises.readFile(librarysPath, 'utf8');
                    libraries = JSON.parse(data);
                } catch (error) {
                    return res.status(500).json({ error: 'Failed to read libraries configuration' });
                }

                // 从配置中移除库
                libraries = libraries.filter((lib: any) => lib.id !== id);

                // 写回文件
                await fsPromises.writeFile(librarysPath, JSON.stringify(libraries, null, 2), 'utf8');

                // 关闭库服务
                if (libraryObj.libraryService) {
                    try {
                        libraryObj.libraryService.close();
                    } catch (closeError) {
                        console.warn('Failed to close library service:', closeError);
                    }
                }

                // 从内存中移除
                delete this.backend.libraries.libraries[id];

                res.json({ message: 'Library deleted successfully' });
            } catch (error) {
                console.error('Error deleting library:', error);
                res.status(500).json({ error: 'Failed to delete library' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
