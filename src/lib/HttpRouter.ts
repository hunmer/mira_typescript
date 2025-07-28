import express, { Router, Request, Response, Handler } from 'express';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';
import path from 'path';
import fs from 'fs';
import { MiraBackend } from './ServerExample';
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
    switch(method){
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