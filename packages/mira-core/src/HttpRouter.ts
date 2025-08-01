import express, { Router, Request, Response, Handler } from 'express';
import multer from 'multer';
import { ILibraryServerData } from 'mira-storage-sqlite';
import path from 'path';
import fs from 'fs';
import { MiraBackend } from './MiraBackend';


export class HttpRouter {
  private router: Router;
  private registerdRounters: Map<string, Map<string, Handler>> = new Map<string, Map<string, Handler>>();
  private libraryServices: ILibraryServerData[] = [];
  backend: MiraBackend;
  upload: multer.Multer;

  constructor(bakend: MiraBackend) {
    this.backend = bakend;
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
      }),
      // limits: {
      //   fileSize: 100 * 1024 * 1024 // 限制100MB
      // }
    });

    this.router = express.Router();
    this.setupRoutes();
  }

  registerRounter(libraryId: string, path: string, method: string, router: Handler) {
    // 获取或创建该路径的 handler Map
    if (!this.registerdRounters.has(path)) {
      this.registerdRounters.set(path, new Map<string, Handler>());

      // 为该路径注册一个统一的处理函数
      const combinedHandler = async (req: Request, res: Response, next: any) => {
        // 从请求中获取 libraryId
        const requestLibraryId = req.body?.libraryId || req.query?.libraryId || req.params?.libraryId;

        if (!requestLibraryId) {
          return res.status(400).send('Missing libraryId parameter');
        }

        const handlersMap = this.registerdRounters.get(path);
        if (!handlersMap) {
          return res.status(404).send('No handlers found for this path');
        }

        const handler = handlersMap.get(requestLibraryId);
        if (!handler) {
          return res.status(404).send(`No handler found for libraryId: ${requestLibraryId}`);
        }

        console.log(`Processing request for path: ${path}, libraryId: ${requestLibraryId}`);
        // 调用对应的 handler
        handler(req, res, next);
      };

      // 根据 method 注册到 express router
      switch (method.toLowerCase()) {
        case 'post':
          this.router.post(path, combinedHandler);
          break;
        case 'get':
          this.router.get(path, combinedHandler);
          break;
        default:
          throw new Error('不支持的方法');
      }
    }

    // 将新的 handler 添加到 Map 中，以 libraryId 为 key
    this.registerdRounters.get(path)!.set(libraryId, router);
  }

  unregisterRounter(path: string, libraryId?: string, handler?: Handler) {
    if (!this.registerdRounters.has(path)) {
      return;
    }

    const handlersMap = this.registerdRounters.get(path)!;

    if (libraryId) {
      // 移除特定 libraryId 的 handler
      if (handler) {
        // 检查是否是指定的 handler
        const existingHandler = handlersMap.get(libraryId);
        if (existingHandler === handler) {
          handlersMap.delete(libraryId);
        }
      } else {
        // 移除该 libraryId 的 handler
        handlersMap.delete(libraryId);
      }

      // 如果没有更多 handler，移除整个路径
      if (handlersMap.size === 0) {
        this.registerdRounters.delete(path);
        // 注意：这里无法从 express router 中移除路由
        // express 不支持动态移除路由，只能重新创建 router
      }
    } else {
      // 移除整个路径的所有 handlers
      this.registerdRounters.delete(path);
    }
  }

  // 获取指定路径和 libraryId 的 handler
  getHandler(path: string, libraryId: string): Handler | undefined {
    const handlersMap = this.registerdRounters.get(path);
    return handlersMap?.get(libraryId);
  }

  // 获取指定路径的所有 handlers（返回 Map）
  getHandlers(path: string): Map<string, Handler> | undefined {
    return this.registerdRounters.get(path);
  }

  // 获取所有注册的路径
  getRegisteredPaths(): string[] {
    return Array.from(this.registerdRounters.keys());
  }

  // 检查路径是否已注册
  hasPath(path: string): boolean {
    return this.registerdRounters.has(path);
  }

  // 检查特定路径和 libraryId 是否已注册
  hasPathForLibrary(path: string, libraryId: string): boolean {
    const handlersMap = this.registerdRounters.get(path);
    return handlersMap ? handlersMap.has(libraryId) : false;
  }

  private setupRoutes(): void {
    // 上传文件
    this.router.post('/libraries/upload', this.upload.array('files'), async (req: Request, res) => {
      const { libraryId, sourcePath } = req.body; // sourcePath是用户的本地文件位置，用来验证是否上传成功
      const clientId = req.body.clientId || null;
      const fields = req.body.fields ? JSON.parse(req.body.fields) : null;
      const payload = req.body.payload ? JSON.parse(req.body.payload) : null;
      const obj = this.backend.libraries.get(libraryId);
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
              this.backend.webSocketServer.broadcastLibraryEvent(libraryId, 'file::created', { ...result, libraryId });
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
    const obj = this.backend.libraries.get(libraryId);
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

  getRouter(): Router {
    return this.router;
  }

  async close(): Promise<void> {
    await Promise.all(this.libraryServices.map(service => service.close()));
    this.libraryServices = [];
  }
}