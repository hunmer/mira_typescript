import { Express, Router } from 'express';
import http from 'http';
import express from 'express';
import axios from "axios";
import { AuthRouter } from "./routes/AuthRouter";
import { UserRouter } from "./routes/UserRouter";
import { LibraryRoutes } from './routes/LibraryRoutes';

import { AdminsRouter } from "./routes/AdminsRouter";
import { MiraServer } from '.';
import { HttpRouter } from './routes/HttpRouter';
import { PluginRoutes } from './routes/PluginRoutes';
import { DatabaseRoutes } from './routes/DatabaseRoutes';
import { FileRoutes } from './routes/FileRoutes';
import { DeviceRoutes } from './routes/DeviceRoutes';

// HTTP请求日志中间件
interface RequestLogData {
    method: string;
    url: string;
    headers: any;
    query: any;
    params: any;
    body: any;
    ip: string;
    userAgent: string;
    timestamp: string;
}

interface ResponseLogData {
    statusCode: number;
    statusMessage: string;
    headers: any;
    body: any;
    responseTime: number;
}

function createHttpLoggerMiddleware() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();

        // 记录请求信息
        const requestData: RequestLogData = {
            method: req.method,
            url: req.originalUrl || req.url,
            headers: req.headers,
            query: req.query,
            params: req.params,
            body: req.body,
            ip: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            timestamp
        };

        // 输出请求信息
        console.log('\n' + '='.repeat(80));
        // console.log(`📥 HTTP REQUEST [${timestamp}]`);
        console.log(`🔗 ${requestData.method.toUpperCase()} ${requestData.url}`);
        // console.log(`🌐 IP: ${requestData.ip}`);
        // console.log(`🔍 User-Agent: ${requestData.userAgent}`);

        if (Object.keys(requestData.query).length > 0) {
            console.log(`❓ Query Parameters:`, JSON.stringify(requestData.query, null, 2));
        }

        if (Object.keys(requestData.params).length > 0) {
            console.log(`📍 Route Parameters:`, JSON.stringify(requestData.params, null, 2));
        }

        console.log(`📤 Request Headers:`, JSON.stringify(requestData.headers, null, 2));

        if (requestData.body && Object.keys(requestData.body).length > 0) {
            console.log(`📦 Request Body:`, JSON.stringify(requestData.body, null, 2));
        }

        // 拦截响应
        const originalSend = res.send;
        const originalJson = res.json;
        let responseBody: any = null;

        // 重写 send 方法
        res.send = function (data: any) {
            responseBody = data;
            return originalSend.call(this, data);
        };

        // 重写 json 方法
        res.json = function (data: any) {
            responseBody = data;
            return originalJson.call(this, data);
        };

        // 监听响应完成
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;

            const responseData: ResponseLogData = {
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                headers: res.getHeaders(),
                body: responseBody,
                responseTime
            };

            // 输出响应信息
            console.log(`📤 HTTP RESPONSE [${new Date().toISOString()}]`);
            console.log(`📊 Status: ${responseData.statusCode} ${responseData.statusMessage}`);
            console.log(`⏱️  Response Time: ${responseData.responseTime}ms`);
            console.log(`📤 Response Headers:`, JSON.stringify(responseData.headers, null, 2));

            if (responseData.body !== null && responseData.body !== undefined) {
                let bodyStr = responseData.body;
                if (typeof responseData.body === 'object') {
                    bodyStr = JSON.stringify(responseData.body, null, 2);
                }
                // 限制输出长度避免控制台过于拥挤
                if (bodyStr.length > 1000) {
                    console.log(`📦 Response Body (truncated):`, bodyStr.substring(0, 1000) + '...[truncated]');
                } else {
                    console.log(`📦 Response Body:`, bodyStr);
                }
            }

            console.log('='.repeat(80) + '\n');
        });

        next();
    };
}

export class MiraHttpServer {
    // 开放所有属性
    app: Express;
    httpServer: http.Server;
    authRouter: AuthRouter;
    userRouter: UserRouter;
    backend: MiraServer;

    // Routers
    libraryRoutes: LibraryRoutes;
    pluginRoutes: PluginRoutes;
    databaseRoutes: DatabaseRoutes;
    fileRoutes: FileRoutes;
    deviceRoutes: DeviceRoutes;
    adminsRouter: AdminsRouter;
    httpRouter: HttpRouter;

    constructor(backend: MiraServer, dataDir: string = './data') {
        this.backend = backend;
        this.app = express();
        this.httpServer = http.createServer(this.app);
        this.authRouter = new AuthRouter(dataDir);
        this.userRouter = new UserRouter(this.authRouter);
        this.adminsRouter = new AdminsRouter(this.authRouter);
        this.libraryRoutes = new LibraryRoutes(backend);
        this.pluginRoutes = new PluginRoutes(backend);
        this.databaseRoutes = new DatabaseRoutes(backend);
        this.fileRoutes = new FileRoutes(backend);
        this.deviceRoutes = new DeviceRoutes(backend);
        this.httpRouter = new HttpRouter(backend);

        this.setupMiddleware();
    }

    public async initialize(): Promise<void> {
        await this.authRouter.initialize();
        this.setupRoutes();
    }

    // 开放功能
    public async request(options: {
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

    private setupMiddleware() {
        // 添加HTTP请求日志中间件
        this.app.use(createHttpLoggerMiddleware());

        // CORS 中间件
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });

        // JSON 解析中间件 - 增加文件上传限制
        this.app.use(express.json({ limit: '2048mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // 静态文件中间件
        this.app.use('/static', express.static('public'));
    }

    private setupRoutes() {
        this.app.use('/', this.httpRouter.getRouter()); // 插件注册服务
        this.app.use('/api/auth', this.authRouter.getRouter());
        this.app.use('/api/admins', this.adminsRouter.getRouter());

        // 注册符合vben标准的用户信息路由
        this.app.use('/api/user', this.userRouter.getRouter());

        // 注册 RESTful 路由
        this.app.use('/api/libraries', this.libraryRoutes.getRouter());
        this.app.use('/api/plugins', this.pluginRoutes.getRouter());
        this.app.use('/api/database', this.databaseRoutes.getRouter());
        this.app.use('/api/files', this.fileRoutes.getRouter());
        this.app.use('/api/devices', this.deviceRoutes.getRouter());

        // 获取所有素材库的插件路由定义
        this.app.get('/api/plugin-routes', (req, res) => {
            try {
                const allRoutes: any[] = [];
                const libraries = this.backend.libraries?.getLibraries() || {};

                for (const [libraryId, libraryData] of Object.entries(libraries)) {
                    if (libraryData.pluginManager) {
                        const routes = libraryData.pluginManager.getAllPluginRoutes();
                        // 为每个路由添加素材库信息
                        const routesWithLibrary = routes.map(route => ({
                            ...route,
                            libraryId,
                            libraryName: libraryData.libraryService?.config?.name || libraryId,
                            // 保留原始路径，同时提供带素材库ID的完整路径
                            originalPath: route.path,
                            path: `/mira/library/${libraryId}${route.path}`
                        }));
                        allRoutes.push(...routesWithLibrary);
                    }
                }

                res.json({
                    code: 0,
                    data: allRoutes,
                    total: allRoutes.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error getting all plugin routes:', error);
                res.status(500).json({
                    code: 500,
                    error: 'Failed to get plugin routes',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // 插件路由API - 获取指定素材库的路由定义
        this.app.get('/api/plugin-routes/:libraryId', (req, res) => {
            try {
                const { libraryId } = req.params;
                if (libraryId != null) {
                    const obj = this.backend.libraries?.getLibrary(libraryId as string);
                    if (obj == null) {
                        return res.status(404).json({
                            code: 404,
                            error: 'Library not found',
                            message: `No library found with id: ${libraryId}`,
                            timestamp: new Date().toISOString()
                        });
                    }
                    const routes = obj.pluginManager.getAllPluginRoutes();
                    res.json({
                        code: 0,
                        data: routes,
                        total: routes.length,
                        timestamp: new Date().toISOString()
                    });
                }

            } catch (error) {
                console.error('Error getting plugin routes:', error);
                res.status(500).json({
                    code: 500,
                    error: 'Failed to get plugin routes',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // 健康检查端点
        this.app.get('/api/health', (req, res) => {
            res.json({
                code: 0,
                data: {
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    version: process.env.npm_package_version || '1.0.0',
                    nodeVersion: process.version,
                    environment: process.env.NODE_ENV || 'development'
                }
            });
        });
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // 错误处理中间件
        this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error('HTTP Server Error:', err);
            res.status(err.status || 500).json({
                error: err.name || 'Internal Server Error',
                message: err.message || 'An unexpected error occurred',
                timestamp: new Date().toISOString(),
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            });
        });
    }

    public start(port: number = 8081): Promise<void> {
        return new Promise((resolve, reject) => {
            this.httpServer.listen(port, (err?: Error) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`🚀 HTTP Server started on port ${port}`);
                    console.log(`📍 Health check: http://localhost:${port}/health`);
                    console.log(`🔗 API base URL: http://localhost:${port}/api`);
                    resolve();
                }
            });
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve) => {
            this.httpServer.close(() => {
                console.log('📴 HTTP Server stopped');
                resolve();
            });
        });
    }

    public getApp(): Express {
        return this.app;
    }

    public getHttpServer(): http.Server {
        return this.httpServer;
    }

    public getAuthRouter(): AuthRouter {
        return this.authRouter;
    }
}
