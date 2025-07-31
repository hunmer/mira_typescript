import { HttpRouter } from "./HttpRouter";
import { Express } from 'express';
import http from 'http';
import express from 'express';
import { LibraryStorage } from "./LibraryStorage";
import { MiraBackend } from "./MiraBackend";
import axios from "axios";


export class MiraHttpServer {
     httpRouter: HttpRouter;
     server: http.Server;
     port: number;
     app: Express;
     backend: MiraBackend;
     libraries: LibraryStorage;

    getRouter(): HttpRouter { return this.httpRouter }

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

    async request(options: {
        method: string;
        url: string;
        headers?: Record<string, string>;
        data?: any;
    }): Promise<any> {
        try {
            const response = await axios.request({
                method: options.method,
                url: options.url,
                headers: options.headers,
                data: options.data
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Request failed: ${error.message}`);
            }
            throw error;
        }
    }

    getPublicURL(url: string) {
        return `http://127.0.0.1:${this.port}/${url}`;
    }

    async stop(): Promise<void> {
        this.server.close();
        this.httpRouter.close();
    }

    
}
