import express, { Router, Request, Response } from 'express';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';
import { LibraryService } from './LibraryService';

export class HttpRouter {
  private router: Router;
  private libraryServices: LibraryServerDataSQLite[] = [];

  constructor() {
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.post('/libraries/:libraryId/connect', async (req: Request, res: Response) => {
      try {
        const { libraryId } = req.params;
        const libraryConfig = req.body;
        
        const existingService = this.libraryServices.find(
          service => service.getLibraryId() === libraryId
        );
        
        if (existingService) {
          return res.json({ status: 'connected', data: existingService.getLibraryInfo() });
        }

        const dbService = new LibraryServerDataSQLite(undefined, libraryConfig);
        await dbService.initialize();
        this.libraryServices.push(dbService);

        const service = new LibraryService(dbService);
        const result = await service.connectLibrary(libraryConfig);

        res.json({ status: 'connected', result });
      } catch (err) {
        res.status(500).json({
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    });

    this.router.get('/libraries/:libraryId/status', (req: Request, res: Response) => {
      const { libraryId } = req.params;
      const service = this.libraryServices.find(
        service => service.getLibraryId() === libraryId
      );

      if (!service) {
        return res.status(404).json({
          status: 'error',
          message: 'Library not found'
        });
      }

      res.json({
        status: 'ok',
        data: service.getLibraryInfo()
      });
    });

    // Add more routes as needed
  }

  getRouter(): Router {
    return this.router;
  }

  async close(): Promise<void> {
    await Promise.all(this.libraryServices.map(service => service.close()));
    this.libraryServices = [];
  }
}