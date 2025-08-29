import { ServerPluginManager, ServerPlugin, MiraWebsocketServer, MiraHttpServer, PluginRouteDefinition } from 'mira-app-server';
import { ILibraryServerData } from 'mira-storage-sqlite';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import Queue from 'queue';
import which from 'which';
import { EventArgs } from 'mira-app-core';

class ThumbPlugin extends ServerPlugin {
    server: MiraWebsocketServer;
    dbService: ILibraryServerData;
    pluginManager: ServerPluginManager;
    taskQueue: Queue;

    constructor({ pluginManager, server, dbService }: { pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData }) {
        super('mira_thumb', pluginManager, dbService);
        // 检查 ffmpeg 是否已安装，并设置 ffmpegPath
        try {
            let ffmpegPath = process.env.FFMPEG_PATH;
            if (!ffmpegPath) {
                ffmpegPath = which.sync('ffmpeg');
            }
            if (ffmpegPath) {
                ffmpeg.setFfmpegPath(ffmpegPath);
                console.log('ffmpeg found at:', ffmpegPath);
                ffmpeg.getAvailableCodecs((err, codecs) => {
                    if (err) {
                        console.error('Error getting ffmpeg codecs:', err);
                    } else {
                        console.log(`${codecs.length} Available ffmpeg codecs`);
                    }
                });
            } else {
                console.warn('ffmpeg not found. Please set FFMPEG_PATH or install ffmpeg.');
            }
        } catch (err) {
            console.warn('ffmpeg not found in PATH or FFMPEG_PATH. Please install ffmpeg.');
        }

        this.server = server;
        this.dbService = dbService;
        this.pluginManager = pluginManager;
        const backend = pluginManager.server.backend;
        const httpServer = backend.getHttpServer();

        this.taskQueue = new Queue({ concurrency: 5, autostart: true });

        // 注册前端路由
        this.initializeRoutes();

        const obj = httpServer.backend.libraries!.getLibrary(dbService.getLibraryId());
        if (obj) {
            obj.eventManager.on('file::created', this.onFileCreated.bind(this));
            obj.eventManager.on('file::deleted', this.onFileDeleted.bind(this));
        }

        // 缩略图操作
        httpServer.httpRouter.registerRounter(dbService.getLibraryId(), '/thumb/:action', 'get', async (req, res) => {
            const { action } = req.params ?? {};
            if (action === 'scan') {
                this.processPendingThumbnails();
                return res.status(200).json({
                    success: true,
                    message: '开始扫描缩略图',
                    queueLength: this.taskQueue.length
                });
            } else if (action === 'progress') {
                const pendingFiles = await this.getPendingThumbFiles();
                const queueLength = this.taskQueue.length;
                const totalPending = pendingFiles.length;
                const processing = queueLength > 0;

                return res.status(200).json({
                    success: true,
                    data: {
                        totalPending: totalPending,
                        queueLength: queueLength,
                        processing: processing,
                        completed: totalPending > 0 ? Math.max(0, totalPending - queueLength) : 0,
                        progress: totalPending > 0 ? Math.round(((totalPending - queueLength) / totalPending) * 100) : 100
                    }
                });
            } else if (action === 'cancel') {
                // 停止队列并清空待处理任务
                this.taskQueue.stop();
                this.taskQueue.splice(0, this.taskQueue.length);
                this.taskQueue.start();

                return res.status(200).json({
                    success: true,
                    message: '已取消缩略图生成任务'
                });
            } else if (action === 'stats') {
                // 获取缩略图统计信息 - 只获取必要字段，避免路径计算
                const allFiles = await this.dbService.getFiles({
                    select: 'id,thumb',
                    filters: { limit: 9999999 },
                    isUrlFile: false,
                    countFile: true,
                });

                const totalFiles = allFiles.result.length;
                const withThumbs = allFiles.result.filter(f => f.thumb === 1).length;
                const withoutThumbs = totalFiles - withThumbs;

                return res.status(200).json({
                    success: true,
                    data: {
                        totalFiles: totalFiles,
                        withThumbnails: withThumbs,
                        withoutThumbnails: withoutThumbs,
                        thumbnailRate: totalFiles > 0 ? Math.round((withThumbs / totalFiles) * 100) : 0
                    }
                });
            }
            return res.status(400).json({ success: false, message: '无效的操作' });
        });
        console.log('Thumbnail plugin initialized');

    }

    private async onFileCreated(event: EventArgs): Promise<void> {
        const { result } = event.args;
        const filePath = result.path;
        const fileType = this.getFileType(filePath);
        if (!fileType) return;

        this.taskQueue.push(async () => {
            try {
                const thumbPath = await this.dbService.getItemThumbPath(result);
                switch (fileType) {
                    case 'image':
                        await this.generateImageThumbnail(filePath, thumbPath);
                        break;
                    case 'video':
                        await this.generateVideoThumbnail(filePath, thumbPath);
                        break;
                }

                // 检查缩略图是否真的生成成功
                if (fs.existsSync(thumbPath)) {
                    result.thumb = thumbPath;
                    console.log('✅ Thumbnail generated successfully:', thumbPath);
                    await this.dbService.updateFile(result.id, { thumb: 1 });
                } else {
                    console.warn('⚠️ Thumbnail generation failed, file not found:', thumbPath);
                }
                this.server.broadcastLibraryEvent(this.dbService.getLibraryId(), 'thumbnail::generated', result);
            } catch (err) {
                console.error('Failed to generate thumbnail:', err);
            }
        });
    }

    private async onFileDeleted(item: any): Promise<void> {
        try {
            const thumbPath = path.join(
                await this.dbService.getItemPath(item),
                'preview.png'
            );

            if (fs.existsSync(thumbPath)) {
                fs.unlinkSync(thumbPath);
            }

            await this.dbService.updateFile(item.id, { thumb: 0 });
        } catch (err) {
            console.error('Failed to delete thumbnail:', err);
        }
    }

    private async generateImageThumbnail(srcPath: string, destPath: string): Promise<void> {
        const thumbDir = path.dirname(destPath);
        if (!fs.existsSync(thumbDir)) {
            fs.mkdirSync(thumbDir, { recursive: true });
        }

        console.log('🖼️ Starting image thumbnail generation:', srcPath, '->', destPath);

        return new Promise<void>((resolve) => {
            ffmpeg(srcPath)
                .outputOptions([
                    '-vf', 'scale=200:-1:force_original_aspect_ratio=decrease',
                    '-frames:v', '1'
                ])
                .output(destPath)
                .on('start', (commandLine) => {
                    console.log('📸 FFmpeg command:', commandLine);
                })
                .on('end', () => {
                    console.log('✅ Image thumbnail generation completed:', destPath);
                    resolve();
                })
                .on('error', (err: Error) => {
                    console.error('❌ Image thumbnail generation error:', srcPath, err.message);
                    resolve(); // 即使出错也继续处理
                })
                .run();
        });
    }

    private async generateVideoThumbnail(srcPath: string, destPath: string): Promise<void> {
        console.log('🎬 Starting video thumbnail generation:', srcPath, '->', destPath);

        return new Promise<void>((resolve) => {
            ffmpeg(srcPath)
                .screenshots({
                    timestamps: ['00:00:01'] as [string],
                    filename: path.basename(destPath),
                    folder: path.dirname(destPath),
                    size: '200x?'
                })
                .on('start', (commandLine) => {
                    console.log('🎥 FFmpeg command:', commandLine);
                })
                .on('end', () => {
                    console.log('✅ Video thumbnail generation completed:', destPath);
                    resolve();
                })
                .on('error', (err: Error) => {
                    console.error('❌ Video thumbnail generation error:', srcPath, err.message);
                    resolve();
                });
        });
    }

    private getFileType(filePath: string): string | null {
        const ext = path.extname(filePath).toLowerCase().slice(1);
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'flv', 'webm'];

        if (imageExtensions.includes(ext)) return 'image';
        if (videoExtensions.includes(ext)) return 'video';
        return null;
    }

    private async getPendingThumbFiles(): Promise<any[]> {
        const files = (await this.dbService.getFiles({ select: 'id,hash,folder_id,name', filters: { thumb: 0, limit: 9999999 }, isUrlFile: false })).result;
        const pendingFiles: any[] = [];
        console.log('results ', files.length);
        for (const file of files) {
            try {
                const thumbPath = await this.dbService.getItemThumbPath(file, { isUrlFile: false });
                if (!fs.existsSync(thumbPath)) {
                    pendingFiles.push(file);
                } else {
                    // 如果数据库状态错误，修正它
                    await this.dbService.updateFile(file.id, { thumb: 1 });
                }
            } catch (error) {
                console.error('Error processing file:', file.id, error);
                continue;
            }
        }
        return pendingFiles;
    }

    // 检查所有丢失的媒体
    public async processPendingThumbnails(): Promise<void> {
        console.log('Start processing pending thumbnails...');
        const pendingFiles = await this.getPendingThumbFiles();
        const max = pendingFiles.length;
        let processed = 0;

        pendingFiles.forEach((file, i) => {
            this.taskQueue.push(async () => {
                try {
                    // 获取文件完整路径
                    const filePath = await this.dbService.getItemFilePath(file, { isUrlFile: false });
                    const fileType = this.getFileType(filePath);
                    console.log({ filePath, fileType });
                    if (!fileType) return;

                    const thumbPath = await this.dbService.getItemThumbPath(file);
                    switch (fileType) {
                        case 'image':
                            await this.generateImageThumbnail(filePath, thumbPath);
                            break;
                        case 'video':
                            await this.generateVideoThumbnail(filePath, thumbPath);
                            break;
                    }

                    // 检查缩略图是否真的生成成功
                    if (fs.existsSync(thumbPath)) {
                        processed++;
                        console.log(`✅ Batch thumbnail processed: ${thumbPath} (${processed}/${max})`);
                        // 更新数据库状态
                        await this.dbService.updateFile(file.id, { thumb: 1 });
                    } else {
                        processed++;
                        console.warn(`⚠️ Batch thumbnail generation failed: ${thumbPath} (${processed}/${max})`);
                    }

                } catch (err) {
                    console.error('Failed to process thumbnail:', err);
                    processed++;
                }
            });
        });
    }

    /**
     * 初始化前端路由
     */
    private initializeRoutes() {
        // 缩略图管理主页面
        const thumbnailRoute: PluginRouteDefinition = {
            name: 'ThumbnailManager',
            group: "媒体管理",
            path: '/media/thumbnails',
            component: 'components/ThumbnailManager.js',
            meta: {
                roles: ['super', 'admin', 'user'], // 所有用户都可以查看
                icon: 'lucide:image',
                title: '缩略图管理',
                order: 1
            }
        };

        this.registerRoutes([thumbnailRoute]);
        console.log(`✅ Thumbnail Plugin routes registered: ${this.getRoutes().length} routes`);
    }
}


export function init(inst: any): ThumbPlugin {
    return new ThumbPlugin(inst);
}


