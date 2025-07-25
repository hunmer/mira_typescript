import express, { Router, Request, Response } from 'express';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';

export class HttpRouter {
  private router: Router;
  private libraryServices: LibraryServerDataSQLite[] = [];

  constructor() {
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.post('/libraries/:libraryId/connect', async (req: Request, res: Response) => {
     
    });

    this.router.get('/libraries/:libraryId/status', (req: Request, res: Response) => {
      
    });
  }

  getRouter(): Router {
    return this.router;
  }

  async close(): Promise<void> {
    await Promise.all(this.libraryServices.map(service => service.close()));
    this.libraryServices = [];
  }
}