import { EventEmitter } from 'events';
import { ILibraryServerData } from '../../../ILibraryServerData';
import { MiraWebsocketServer } from '../../../WebSocketServer';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { EventArgs } from '../../../event-manager';
import { ServerPluginManager } from '../../../ServerPluginManager';
import { MiraHttpServer } from '../../../HttpServer';

class ThumbPlugin {
    private readonly server: MiraWebsocketServer;
    private readonly dbService: ILibraryServerData;
    private readonly eventEmitter: EventEmitter;
    private readonly pluginManager: ServerPluginManager;

    constructor({ pluginManager, server, dbService, httpServer }: { pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData, httpServer: MiraHttpServer }) {
        this.server = server;
        this.dbService = dbService;
        this.eventEmitter = dbService.getEventManager();
        this.pluginManager = pluginManager;
        console.log('Thumbnail plugin initialized');
        // Register event listeners
        this.eventEmitter.on('file::created', this.onFileCreated.bind(this));
        this.eventEmitter.on('file::deleted', this.onFileDeleted.bind(this));
        this.processPendingThumbnails();
    }



    private async onFileCreated(event: EventArgs): Promise<void> {
        try {
            const { result } = event.args;
            const filePath = result.path;
            const fileType = this.getFileType(filePath);
            if (!fileType) return;

            const thumbPath = await this.dbService.getItemThumbPath(result);
            switch (fileType) {
                case 'image':
                    await this.generateImageThumbnail(filePath, thumbPath);
                    break;
                case 'video':
                    await this.generateVideoThumbnail(filePath, thumbPath);
                    break;
            }

            result.thumb = thumbPath;
            await this.dbService.updateFile(result.id, { thumb: 1 });
            this.server.broadcastLibraryEvent(this.dbService.getLibraryId(), 'thumbnail::generated', result);
        } catch (err) {
            console.error('Failed to generate thumbnail:', err);
        }
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
        try {
            await sharp(srcPath)
                .resize(200, 200, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .toFile(destPath);
        } catch (err) {
            console.error('Image thumbnail generation error:', err);
        }
    }

    private async generateVideoThumbnail(srcPath: string, destPath: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            ffmpeg(srcPath)
                .screenshots({
                    timestamps: ['00:00:01'] as [string],
                    filename: path.basename(destPath),
                    folder: path.dirname(destPath),
                    size: '200x?'
                })
                .on('end', () => resolve())
                .on('error', (err: Error) => {
                    console.error('Video thumbnail generation error:', err);
                    reject(err);
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
        const files = (await this.dbService.getFiles({ filters: { thumb: 1 } })).result;
        const pendingFiles: any[] = [];

        for (const file of files) {
            const thumbPath = await this.dbService.getItemThumbPath(file);
            if (!fs.existsSync(thumbPath)) {
                pendingFiles.push(file);
            }
        }
        return pendingFiles;
    }

    // 检查所有丢失的媒体
    public async processPendingThumbnails(): Promise<void> {
        const pendingFiles = await this.getPendingThumbFiles();
        const processingPromises: Promise<void>[] = [];

        for (let i = 0; i < Math.min(pendingFiles.length, 3); i++) {
            const file = pendingFiles[i];
            const filePath = file.path;
            const fileType = this.getFileType(filePath);
            if (!fileType) continue;
            const processPromise = (async () => {
                const thumbPath = await this.dbService.getItemThumbPath(file);
                switch (fileType) {
                    case 'image':
                        return this.generateImageThumbnail(filePath, thumbPath);
                    case 'video':
                        return this.generateVideoThumbnail(filePath, thumbPath);
                    default:
                        return Promise.resolve();
                }
            })().then(() => {
                console.log('Thumbnail processed:', file.name);
            }).catch(err => {
                console.error('Failed to process thumbnail:', err);
            });
            processingPromises.push(processPromise);
        }

        await Promise.all(processingPromises);
    }
}


export function init(inst: any): ThumbPlugin {
    return new ThumbPlugin(inst);
}


