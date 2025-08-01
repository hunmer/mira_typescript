import { MiraWebsocketServer, EventArgs, ServerPluginManager, MiraHttpServer, ServerPlugin } from 'mira-app-core';
import { ILibraryServerData } from 'mira-storage-sqlite';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import Queue from 'queue';

class ThumbPlugin extends ServerPlugin {
      server: MiraWebsocketServer;
      dbService: ILibraryServerData;
      pluginManager: ServerPluginManager;
      taskQueue: Queue;

    constructor({ pluginManager, server, dbService, httpServer }: { pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData, httpServer: MiraHttpServer }) {
        super('mira_thumb', pluginManager, dbService, httpServer);
        this.server = server;
        this.dbService = dbService;
        this.pluginManager = pluginManager;
        
        // Initialize queue with concurrency of 5
        this.taskQueue = new Queue({ concurrency: 5, autostart: true });
        console.log('Thumbnail plugin initialized');
        const obj = httpServer.libraries.get(dbService.getLibraryId());
        if(obj){
             obj.eventManager.on('file::created', this.onFileCreated.bind(this));
            obj.eventManager.on('file::deleted', this.onFileDeleted.bind(this));
            // this.processPendingThumbnails();
        }
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

                result.thumb = thumbPath;
                await this.dbService.updateFile(result.id, { thumb: 1 });
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
        
        return new Promise<void>((resolve, reject) => {
            console.log({srcPath});
            ffmpeg(srcPath)
                .outputOptions([
                    '-vf', 'scale=200:200:force_original_aspect_ratio=decrease',
                    '-frames:v', '1'
                ])
                .output(destPath)
                .on('end', () => resolve())
                .on('error', (err: Error) => {
                    console.error('Image thumbnail generation error:', srcPath);
                    resolve(); // 即使出错也继续处理
                })
                .run();
        });
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
                    console.error('Video thumbnail generation error: ', srcPath);
                    // reject(err);
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
        const files = (await this.dbService.getFiles({ select: 'id,path,hash,folder_id,name', filters: { thumb: 1 , limit: 9999999 }, isUrlFile: false })).result;
        const pendingFiles: any[] = [];
        console.log('results ', files.length);
        for (const file of files) {
            const thumbPath = await this.dbService.getItemThumbPath(file, { isUrlFile: false });
            if (!fs.existsSync(thumbPath)) {
                pendingFiles.push(file);
            }
        }
        return pendingFiles;
    }

    // 检查所有丢失的媒体
    public async processPendingThumbnails(): Promise<void> {
        console.log('Start processing pending thumbnails...');
        const pendingFiles = await this.getPendingThumbFiles();
        const max = pendingFiles.length;
        
        pendingFiles.forEach((file, i) => {
            this.taskQueue.push(async () => {
                try {
                    const filePath = file.path;
                    const fileType = this.getFileType(filePath);
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
                    console.log('Thumbnail processed:', thumbPath, `(${i+1}/${max})`);
                } catch (err) {
                    console.error('Failed to process thumbnail:', err);
                }
            });
        });
    }
}


export function init(inst: any): ThumbPlugin {
    return new ThumbPlugin(inst);
}


