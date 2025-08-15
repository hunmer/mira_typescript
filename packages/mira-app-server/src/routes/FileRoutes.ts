import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import { MiraServer } from '../server';

export class FileRoutes {
    private router: Router;
    private backend: MiraServer;
    private upload!: multer.Multer;

    constructor(backend: MiraServer) {
        this.backend = backend;
        this.router = Router();
        this.setupUpload();
        this.setupRoutes();
    }

    private setupUpload(): void {
        // 配置multer文件上传
        this.upload = multer({
            storage: multer.diskStorage({
                destination: (req, file, cb) => {
                    const tempDir = path.join(this.backend.dataPath, 'temp');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    cb(null, tempDir);
                },
                filename: (req, file, cb) => {
                    // 处理中文名，确保文件名为utf8编码
                    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    cb(null, uniqueSuffix + path.extname(originalName));
                }
            })
        });
    }

    private setupRoutes(): void {
        // 上传文件到资源库
        this.router.post('/upload', this.upload.array('files'), async (req: Request, res: Response) => {
            const { libraryId, sourcePath } = req.body; // sourcePath是用户的本地文件位置，用来验证是否上传成功
            const clientId = req.body.clientId || null;
            const fields = req.body.fields ? JSON.parse(req.body.fields) : null;
            const payload = req.body.payload ? JSON.parse(req.body.payload) : null;
            const obj = this.backend.libraries.getLibrary(libraryId);
            if (!obj) return res.status(404).send('Library not found');

            // 解析上传的文件
            const files = req.files as Express.Multer.File[];
            if (!files || !files.length) return res.status(400).send('No files uploaded.');

            try {
                const results = [];
                for (const file of files) {
                    try {
                        // 生成唯一文件名并保存文件
                        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                        const { tags, folder_id } = payload.data || {}
                        const fileData = {
                            name: req.body.name || originalName,
                            tags: JSON.stringify(tags || []),
                            folder_id: folder_id || null,
                        };

                        const result = await obj.libraryService.createFileFromPath(file.path, fileData, { importType: 'move' }); // 使用move上传完成后自动删除临时文件
                        results.push({
                            success: true,
                            file: file.path,
                            result
                        });

                        // 发布公告
                        // 发送WebSocket事件（如果可用）
                        if (this.backend.webSocketServer) {
                            this.backend.webSocketServer.broadcastPluginEvent('file::created', {
                                message: {
                                    type: 'file',
                                    action: 'create',
                                    fields, payload
                                }, result, libraryId
                            });

                            if (clientId) {
                                const ws = this.backend.webSocketServer?.getWsClientById(libraryId, clientId);
                                ws && this.backend.webSocketServer?.sendToWebsocket(ws, { eventName: 'file::uploaded', data: { path: sourcePath } });
                                this.backend.webSocketServer?.broadcastLibraryEvent(libraryId, 'file::created', { ...result, libraryId });
                            }
                        }
                    } catch (error) {
                        console.error(`Error processing file ${file.originalname}:`, error);
                        results.push({
                            success: false,
                            file: file.path,
                            error: error instanceof Error ? error.message : String(error)
                        });
                    }
                }
                res.send({ results });
            } catch (error) {
                console.error('Error uploading files:', error);
                res.status(500).send('Internal server error while processing the upload.');
            }
        });

        // 获取文件缩略图
        this.router.get('/thumb/:libraryId/:id', async (req: Request, res: Response) => {
            try {
                const ret = await this.parseLibraryItem(req, res);
                if (ret) {
                    const thumbPath = await ret.library.getItemThumbPath(ret.item, { isNetworkImage: false });
                    if (!fs.existsSync(thumbPath)) return res.status(404).send('Thumbnail not found');

                    res.setHeader('Content-Type', 'image/png');
                    fs.createReadStream(thumbPath).pipe(res);
                }
            } catch (err) {
                console.error('Error serving thumbnail:', err);
                res.status(500).send('Internal server error');
            }
        });

        // 获取文件内容
        this.router.get('/file/:libraryId/:id', async (req: Request, res: Response) => {
            const ret = await this.parseLibraryItem(req, res);
            if (ret) {
                const filePath = await ret.library.getItemFilePath(ret.item);
                if (!filePath || !fs.existsSync(filePath)) {
                    return res.status(404).send('File not found');
                }

                const fileExt = path.extname(filePath).toLowerCase();
                const contentType = this.getContentType(fileExt);
                res.setHeader('Content-Type', contentType);
                fs.createReadStream(filePath).pipe(res);
            }
        });
    }

    private async parseLibraryItem(req: Request, res: Response): Promise<{ library: any, item: any } | void> {
        const { libraryId, id } = req.params;
        const obj = this.backend.libraries.getLibrary(libraryId);
        if (!obj) {
            res.status(404).send('Library not found');
            return;
        }

        const item = await obj.libraryService.getFile(parseInt(id));
        if (!item) {
            res.status(404).send('Item not found');
            return;
        }
        return { library: obj.libraryService, item };
    }

    private getContentType(ext: string): string {
        const mimeTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.json': 'application/json',
            '.mp4': 'video/mp4',
            '.mp3': 'audio/mpeg',
            '.zip': 'application/zip',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    public getRouter(): Router {
        return this.router;
    }
}