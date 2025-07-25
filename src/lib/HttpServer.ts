import { HttpRouter } from "./HttpRouter";
import { Express } from 'express';
import http from 'http';
import express from 'express';
import { LibraryStorage } from "./LibraryStorage";
import { LibraryServerDataSQLite } from "./LibraryServerDataSQLite";
import { MiraBackend } from "./ServerExample";


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
        this.httpRouter = new HttpRouter(backend);
        this.app.use(express.json());

        this.server = http.createServer(this.app);
        this.app.use('/api', this.httpRouter.getRouter());

        // 启动HTTP服务器
        this.server.listen(this.port, () => {
            console.log(`HTTP server running on port ${this.port}`);
        });
    }


    getPublicURL(url: string) {
        return `http://127.0.0.1:${this.port}/api/${url}`;
    }

    async stop(): Promise<void> {
        this.server.close();
        this.httpRouter.close();
    }

    
}
