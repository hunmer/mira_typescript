import express, { Router, Request, Response, Handler } from 'express';
import multer from 'multer';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';
import path from 'path';
import fs from 'fs';
import { MiraBackend } from './ServerExample';

// 配置multer文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  // limits: {
  //   fileSize: 100 * 1024 * 1024 // 限制100MB
  // }
});
export class HttpRouter {
  private router: Router;
  private registerdRounters: Map<string, Handler> = new Map<string, Handler>();
  private libraryServices: LibraryServerDataSQLite[] = [];
  backend: MiraBackend;

  constructor(bakend: MiraBackend) {
    this.backend = bakend;
    this.router = express.Router();
    this.setupRoutes();
  }

  registerRounter(path: string, method: string, router: Handler) {
    if (this.registerdRounters.has(path)) {
      return;
    }
    this.registerdRounters.set(path, router);
    console.log('register rounter', path, method);
    switch (method) {
      case 'post':
        this.router.post(path, router);
        break;
      case 'get':
        this.router.get(path, router);
        break;
      default:
        throw new Error('不支持的方法');
    }
  }

  unregisterRounter(path: string) {
    this.router.unlink(path);
  }

  private setupRoutes(): void {
    this.router.post('/libraries/:libraryId/connect', async (req: Request, res: Response) => {

    });

    this.router.get('/libraries/:libraryId/status', (req: Request, res: Response) => {

    });


    // 上传文件
    this.router.post('/libraries/upload', upload.array('files'), async (req: Request, res) => {
      const { libraryId, sourcePath } = req.body; // sourcePath是用户的本地文件位置，用来验证是否上传成功
      const clientId = req.body.clientId || null;
      const fields = req.body.fields ? JSON.parse(req.body.fields) : null;
      const payload = req.body.payload ? JSON.parse(req.body.payload) : null;
      const library = this.backend.libraries.get(libraryId);
      if (!library) return res.status(404).send('Library not found');

      // 解析上传的文件
      const files = req.files as Express.Multer.File[];
      if (!files || !files.length) return res.status(400).send('No files uploaded.');

      try {
        const results = [];
        for (const file of files) {
          try {
            // 确保临时目录存在
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }

            // 生成唯一文件名并保存文件
            const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            const tempFilePath = path.join(tempDir, `${Date.now()}-${originalName}`);

            // 确保有有效的文件数据
            if (file.buffer) {
              await fs.promises.writeFile(tempFilePath, file.buffer);
            } else if (file.path) {
              // 如果使用diskStorage，文件已保存到指定路径
              await fs.promises.copyFile(file.path, tempFilePath);
            } else {
              throw new Error('No valid file data available');
            }

            const {tags, folder_id} =  payload.data || {}
            const fileData = {
              name: req.body.name || originalName,
              tags: JSON.stringify(tags || []),
              folder_id: folder_id || null,
            };

            const result = await library.createFileFromPath(tempFilePath, fileData, { importType: 'move' }); // 使用move上传完成后自动删除临时文件
            results.push({
              success: true,
              file: tempFilePath,
              result
            });

            // 发布公告
            this.backend.webSocketServer.broadcastPluginEvent('file::created', {
              message: {
                type: 'file',
                action: 'create',
                fields, payload
              }, result, libraryId
            });
            if (clientId) {
              const ws = this.backend.webSocketServer.getWsClientById(libraryId, clientId);
              ws && this.backend.webSocketServer.sendToWebsocket(ws, { eventName: 'file::uploaded', data: { path: sourcePath } });
              this.backend.webSocketServer.broadcastLibraryEvent(libraryId, 'file::created', {...result, libraryId});
            }
          } catch (error) {
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

    // 添加文件流路由
    this.router.get('/thumb/:libraryId/:id', async (req, res) => {
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


    this.router.get('/file/:libraryId/:id', async (req, res) => {
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


  private async parseLibraryItem(req: express.Request, res: express.Response): Promise<{ library: any, item: any } | void> {
    const { libraryId, id } = req.params;
    const library = this.backend.libraries.get(libraryId);
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

  getRouter(): Router {
    return this.router;
  }

  async close(): Promise<void> {
    await Promise.all(this.libraryServices.map(service => service.close()));
    this.libraryServices = [];
  }
}