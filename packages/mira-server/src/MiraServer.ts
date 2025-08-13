import { MiraBackend } from "mira-app-core";
import { HttpServer } from "./HttpServer";
import { WebSocketServer } from "./WebSocketServer";

export interface ServerConfig {
    httpPort?: number;
    wsPort?: number;
    enableHttp?: boolean;
    enableWebSocket?: boolean;
    dataPath?: string;
}

export class MiraServer {
    private backend: MiraBackend;
    private httpServer?: HttpServer;
    private wsServer?: WebSocketServer;
    private config: ServerConfig;

    constructor(config: ServerConfig = {}) {
        this.config = {
            httpPort: 8080,
            wsPort: 8081,
            enableHttp: true,
            enableWebSocket: true,
            ...config
        };

        console.log('🚀 Initializing Mira Server...');
        console.log('📋 Configuration:', this.config);

        // 初始化后端 - 只传递MiraBackend认识的属性
        this.backend = new MiraBackend({
            dataPath: this.config.dataPath,
            wsPort: this.config.wsPort,
            autoLoad: true,
            autoStart: true
        });
    }

    public async start(): Promise<void> {
        try {
            console.log('🔄 Starting Mira Server components...');

            // 启动HTTP服务器
            if (this.config.enableHttp) {
                this.httpServer = new HttpServer(this.backend, this.config.dataPath);
                await this.httpServer.initialize();
                await this.httpServer.start(this.config.httpPort!);
            }

            // 启动WebSocket服务器（复用HTTP服务器）
            if (this.config.enableWebSocket && this.httpServer) {
                this.wsServer = new WebSocketServer(
                    this.httpServer.getHttpServer(),
                    this.backend
                );
                console.log(`🔌 WebSocket Server initialized on port ${this.config.httpPort}`);
            }

            console.log('✅ Mira Server started successfully!');
            this.printServerInfo();

        } catch (error) {
            console.error('❌ Failed to start Mira Server:', error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        console.log('🔄 Stopping Mira Server...');

        if (this.httpServer) {
            await this.httpServer.stop();
        }

        console.log('✅ Mira Server stopped successfully');
    }

    private printServerInfo(): void {
        console.log('\n' + '='.repeat(60));
        console.log('🎉 MIRA SERVER RUNNING');
        console.log('='.repeat(60));

        if (this.config.enableHttp) {
            console.log(`📍 HTTP API: http://localhost:${this.config.httpPort}/api`);
            console.log(`🏥 Health Check: http://localhost:${this.config.httpPort}/health`);
        }

        if (this.config.enableWebSocket) {
            console.log(`🔌 WebSocket: ws://localhost:${this.config.httpPort}`);
        }

        console.log(`📂 Data Path: ${this.config.dataPath || 'default'}`);
        console.log('='.repeat(60) + '\n');
    }

    public getBackend(): MiraBackend {
        return this.backend;
    }

    public getHttpServer(): HttpServer | undefined {
        return this.httpServer;
    }

    public getWebSocketServer(): WebSocketServer | undefined {
        return this.wsServer;
    }

    // 静态方法用于快速启动
    public static async createAndStart(config: ServerConfig = {}): Promise<MiraServer> {
        const server = new MiraServer(config);
        await server.start();
        return server;
    }
}
