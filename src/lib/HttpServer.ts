import { HttpRouter } from "./HttpRouter";
import { Express } from 'express';
import http from 'http';
import express from 'express';
import { LibraryStorage } from "./LibraryStorage";
import { LibraryServerDataSQLite } from "./LibraryServerDataSQLite";
import { MiraBackend } from "./ServerExample";
import * as fs from 'fs';
import * as path from 'path';

export class MiraHttpServer {
    private httpRouter: HttpRouter;
    private server: http.Server;
    private port: number;
    private app: Express;
    private backend: MiraBackend;
    private libraries: LibraryStorage;

    constructor(port: number, backend: MiraBackend) {
        this.port = port;
        this.backend = backend;
        this.libraries = backend.libraries;

        // 创建Express应用
        this.app = express();
        this.port = port;
        this.httpRouter = new HttpRouter();
        this.app.use(express.json());

        this.server = http.createServer(this.app);
        this.app.use('/api', this.httpRouter.getRouter());

        // 添加文件流路由
        this.app.get('/thumb/:libraryId/:id', async (req, res) => {
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

        this.app.get('/file/:libraryId/:id', async (req, res) => {
            const ret = await this.parseLibraryItem(req, res);
            if (ret) {
                const filePath = await ret.library.getItemFilePath(ret.item);
                if (!filePath || !fs.existsSync(filePath)) {
                    return res.status(404).send('File not found');
                }

                const fileExt = path.extname(filePath).toLowerCase();
                const contentType = this.getContentType(fileExt);
                res.setHeader('Content-Type', contentType);
            }
        });

        // 启动HTTP服务器
        this.server.listen(this.port, () => {
            console.log(`HTTP server running on port ${this.port}`);
        });
    }

    private async parseLibraryItem(req: express.Request, res: express.Response): Promise<{ library: any, item: any } | void> {
        const { libraryId, id } = req.params;
        const library = this.libraries.get(libraryId);
        if (!library) {
            res.status(404).send('Library not found');
            return;
        }

        const item = await library.getFile(parseInt(id));
        if (!item) {
            res.status(404).send('Item not found');
            return;
        }
        return { library, item };
    }

    getPublicURL(url: string) {
        return `http://127.0.0.1:${this.port}/api/${url}`;
    }

    async stop(): Promise<void> {
        this.server.close();
        this.httpRouter.close();
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
}
