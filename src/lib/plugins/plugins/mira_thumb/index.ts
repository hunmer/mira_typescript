import { EventEmitter } from 'events';
import { ILibraryServerData } from '../../../ILibraryServerData';
import { MiraWebsocketServer } from '../../../WebSocketServer';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { EventArgs } from '../../../event-manager';

 class ThumbPlugin {
    private readonly server: MiraWebsocketServer;
    private readonly dbService: ILibraryServerData;
    private readonly eventEmitter: EventEmitter;

    constructor(server: MiraWebsocketServer, dbService: ILibraryServerData) {
        this.server = server;
        this.dbService = dbService;
        this.eventEmitter = dbService.getEventManager();
        console.log('Thumbnail plugin initialized');
        // Register event listeners
        this.eventEmitter.on('file::created', this.onFileCreated.bind(this));
        this.eventEmitter.on('file::deleted', this.onFileDeleted.bind(this));
    }

    private async onFileCreated(event: EventArgs): Promise<void> {
        try {
            const item = event.args;
            const filePath = item.path;
            const fileType = this.getFileType(filePath);
            if (!fileType) return;

            const thumbPath = await this.dbService.getItemThumbPath(item);
            const thumbDir = path.dirname(thumbPath);

            if (!fs.existsSync(thumbDir)) {
                fs.mkdirSync(thumbDir, { recursive: true });
            }

            switch (fileType ) {
                case 'image':
                    await this.generateImageThumbnail(filePath, thumbPath);
                    break;
                case 'video':
                    await this.generateVideoThumbnail(filePath, thumbPath);
                    break;
            }

            item.thumb = thumbPath;
            await this.dbService.updateFile(item.id, { thumb: 1 });
            this.server.broadcastLibraryEvent(this.dbService.getLibraryId(), 'thumbnail::generated', item);
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
}

export function init(server: MiraWebsocketServer, dbService: ILibraryServerData): ThumbPlugin {
    return new ThumbPlugin(server, dbService);
}


