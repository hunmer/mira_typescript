import { HttpRouter } from "mira-app-core";
import { Express, Router } from 'express';
import http from 'http';
import express from 'express';
import { LibraryStorage } from "mira-app-core";
import { MiraBackend } from "mira-app-core";
import axios from "axios";
import { AuthRouter } from "./AuthRouter";

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
        console.log(`📥 HTTP REQUEST [${timestamp}]`);
        console.log(`🔗 ${requestData.method.toUpperCase()} ${requestData.url}`);
        console.log(`🌐 IP: ${requestData.ip}`);
        console.log(`🔍 User-Agent: ${requestData.userAgent}`);

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

export class HttpServer {
    protected app: Express;
    protected httpServer: http.Server;
    protected httpRouter: HttpRouter;
    protected authRouter: AuthRouter;
    protected backend: MiraBackend;

    constructor(backend: MiraBackend, dataDir: string = './data') {
        this.backend = backend;
        this.app = express();
        this.httpServer = http.createServer(this.app);
        this.httpRouter = new HttpRouter(backend);
        this.authRouter = new AuthRouter(dataDir);

        this.setupMiddleware();
    }

    public async initialize(): Promise<void> {
        await this.authRouter.initialize();
        this.setupRoutes();
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

        // JSON 解析中间件
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // 静态文件中间件
        this.app.use('/static', express.static('public'));
    }

    private setupRoutes() {
        // 认证路由（挂载到根路径，因为前端期望 /auth/* 路径）
        this.app.use('/auth', this.authRouter.getRouter());

        // 管理员管理路由
        this.app.get('/api/admins', this.authRouter.authMiddleware(), async (req, res) => {
            try {
                // 获取所有用户（管理员）
                const users = await this.authRouter.getAuthService().getUserStorage().getAllUsers();
                const admins = users.map((user: any) => ({
                    id: user.id.toString(),
                    username: user.username,
                    email: user.email || `${user.username}@mira.local`,
                    role: 'admin',
                    createdAt: user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString(),
                    updatedAt: user.updated_at ? new Date(user.updated_at).toISOString() : new Date().toISOString()
                }));
                res.json(admins);
            } catch (error) {
                console.error('Error getting admins:', error);
                res.status(500).json({ error: 'Failed to get admins' });
            }
        });

        // 创建管理员
        this.app.post('/api/admins', this.authRouter.authMiddleware(), async (req, res) => {
            try {
                const { username, email, password } = req.body;

                if (!username || !password) {
                    return res.status(400).json({
                        success: false,
                        message: '用户名和密码不能为空'
                    });
                }

                const userStorage = this.authRouter.getAuthService().getUserStorage();

                // 检查用户名是否已存在（包括已删除的用户）
                const existingUser = await userStorage.findUserByUsernameIncludeInactive(username);
                if (existingUser) {
                    if (existingUser.is_active) {
                        return res.status(400).json({
                            success: false,
                            message: '用户名已存在'
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            message: '该用户名已被使用（已删除的账户），请使用其他用户名'
                        });
                    }
                }

                // 创建新管理员
                const now = Date.now();
                const hashedPassword = userStorage.hashPassword(password);
                const newAdmin = {
                    username,
                    email: email || `${username}@mira.local`,
                    password: hashedPassword,
                    role: 'admin',
                    permissions: ['admin'],
                    created_at: now,
                    updated_at: now,
                    is_active: true
                };

                const adminId = await userStorage.createUser(newAdmin);

                res.json({
                    success: true,
                    message: '管理员创建成功',
                    data: { id: adminId.toString() }
                });

                console.log(`✅ Created new admin: ${username}`);
            } catch (error: any) {
                console.error('Error creating admin:', error);

                // 处理数据库约束错误
                if (error?.code === 'SQLITE_CONSTRAINT' && error?.message?.includes('UNIQUE constraint failed: users.username')) {
                    return res.status(400).json({
                        success: false,
                        message: '用户名已存在，请使用其他用户名'
                    });
                }

                res.status(500).json({
                    success: false,
                    message: '创建管理员失败',
                    error: error?.message || '未知错误'
                });
            }
        });

        // 更新管理员
        this.app.put('/api/admins/:id', this.authRouter.authMiddleware(), async (req, res) => {
            try {
                const { id } = req.params;
                const { email, username, password } = req.body;

                const userStorage = this.authRouter.getAuthService().getUserStorage();
                const updateData: any = {};

                if (email !== undefined) {
                    updateData.email = email;
                }
                if (username !== undefined) {
                    updateData.username = username;
                }
                if (password !== undefined && password.trim() !== '') {
                    updateData.password = password; // UserStorage.updateUser 会自动hash密码
                }

                const success = await userStorage.updateUser(parseInt(id), updateData);

                if (success) {
                    res.json({
                        success: true,
                        message: '管理员信息更新成功'
                    });
                    console.log(`✅ Updated admin: ${id}`);
                } else {
                    res.status(404).json({
                        success: false,
                        message: '管理员不存在或更新失败'
                    });
                }
            } catch (error: any) {
                console.error('Error updating admin:', error);
                res.status(500).json({
                    success: false,
                    message: '更新管理员失败',
                    error: error?.message || '未知错误'
                });
            }
        });

        // 删除管理员
        this.app.delete('/api/admins/:id', this.authRouter.authMiddleware(), async (req, res) => {
            try {
                const { id } = req.params;
                const currentUser = (req as any).user;

                // 防止删除自己
                if (currentUser && currentUser.id.toString() === id) {
                    return res.status(400).json({
                        success: false,
                        message: '不能删除自己的账户'
                    });
                }

                const userStorage = this.authRouter.getAuthService().getUserStorage();
                const success = await userStorage.softDeleteUser(parseInt(id));

                if (success) {
                    res.json({
                        success: true,
                        message: '管理员删除成功'
                    });
                    console.log(`✅ Deleted admin: ${id}`);
                } else {
                    res.status(404).json({
                        success: false,
                        message: '管理员不存在或删除失败'
                    });
                }
            } catch (error: any) {
                console.error('Error deleting admin:', error);
                res.status(500).json({
                    success: false,
                    message: '删除管理员失败',
                    error: error?.message || '未知错误'
                });
            }
        });

        // API 路由（业务逻辑路由） 
        this.app.use('/api', this.httpRouter.getRouter() as any);        // API 健康检查端点
        this.app.get('/api/health', (req, res) => {
            res.json({
                success: true,
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                nodeVersion: process.version,
                environment: process.env.NODE_ENV || 'development'
            });
        });

        // 健康检查端点
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // 404 处理
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Cannot ${req.method} ${req.originalUrl}`,
                timestamp: new Date().toISOString()
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

    public start(port: number = 8080): Promise<void> {
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
