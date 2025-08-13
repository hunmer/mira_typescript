import { Router, Request, Response } from 'express';
import { UserStorage, User } from './UserStorage';

class AuthService {
    private userStorage: UserStorage;

    constructor(dataDir: string = './data') {
        this.userStorage = new UserStorage(dataDir);
    }

    async initialize(): Promise<void> {
        await this.userStorage.initialize();
    }

    // 验证用户凭据
    async authenticateUser(username: string, password: string): Promise<User | null> {
        return await this.userStorage.authenticateUser(username, password);
    }

    // 生成令牌
    async generateToken(userId: number): Promise<string> {
        return await this.userStorage.createSession(userId);
    }

    // 验证令牌
    async validateToken(token: string): Promise<User | null> {
        return await this.userStorage.validateSession(token);
    }

    // 撤销令牌
    async revokeToken(token: string): Promise<boolean> {
        return await this.userStorage.revokeSession(token);
    }

    // 获取用户信息（不包含密码）
    getUserInfo(user: User) {
        return this.userStorage.getUserInfo(user);
    }

    // 清理过期令牌
    async cleanupExpiredTokens(): Promise<number> {
        return await this.userStorage.cleanupExpiredSessions();
    }

    async close(): Promise<void> {
        await this.userStorage.close();
    }

    getUserStorage(): UserStorage {
        return this.userStorage;
    }
}

export class AuthRouter {
    private router: Router;
    private authService: AuthService;

    constructor(dataDir: string = './data') {
        this.router = Router();
        this.authService = new AuthService(dataDir);
        this.setupRoutes();

        // 每小时清理一次过期令牌
        setInterval(async () => {
            try {
                const cleaned = await this.authService.cleanupExpiredTokens();
                if (cleaned > 0) {
                    console.log(`🧹 清理了 ${cleaned} 个过期会话`);
                }
            } catch (error) {
                console.error('清理过期会话时出错:', error);
            }
        }, 60 * 60 * 1000);
    }

    async initialize(): Promise<void> {
        await this.authService.initialize();
    }

    private setupRoutes(): void {
        // 登录路由
        this.router.post('/login', async (req: Request, res: Response) => {
            try {
                const { username, password } = req.body;

                console.log('📝 Login attempt:', { username, passwordLength: password?.length });

                if (!username || !password) {
                    return res.status(400).json({
                        success: false,
                        message: '用户名和密码不能为空',
                        code: 'MISSING_CREDENTIALS'
                    });
                }

                const user = await this.authService.authenticateUser(username, password);

                if (user) {
                    const token = await this.authService.generateToken(user.id);

                    res.json({
                        success: true,
                        message: '登录成功',
                        data: {
                            token,
                            user: this.authService.getUserInfo(user)
                        }
                    });

                    console.log(`✅ User ${username} logged in successfully`);
                } else {
                    res.status(401).json({
                        success: false,
                        message: '用户名或密码错误',
                        code: 'INVALID_CREDENTIALS'
                    });

                    console.log(`❌ Failed login attempt for username: ${username}`);
                }
            } catch (error) {
                console.error('Login error:', error);
                res.status(500).json({
                    success: false,
                    message: '服务器内部错误',
                    code: 'INTERNAL_ERROR'
                });
            }
        });

        // 登出路由
        this.router.post('/logout', async (req: Request, res: Response) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');

                if (token) {
                    const revoked = await this.authService.revokeToken(token);
                    console.log(`🔓 Token ${revoked ? 'successfully' : 'failed to'} revoked`);
                }

                res.json({
                    success: true,
                    message: '退出成功'
                });
            } catch (error) {
                console.error('Logout error:', error);
                res.status(500).json({
                    success: false,
                    message: '服务器内部错误'
                });
            }
        });

        // 获取用户信息路由
        this.router.get('/profile', async (req: Request, res: Response) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: '未提供认证令牌',
                        code: 'NO_TOKEN'
                    });
                }

                const user = await this.authService.validateToken(token);

                if (user) {
                    res.json({
                        success: true,
                        data: {
                            user: this.authService.getUserInfo(user)
                        }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        message: '无效或过期的认证令牌',
                        code: 'INVALID_TOKEN'
                    });
                }
            } catch (error) {
                console.error('Profile error:', error);
                res.status(500).json({
                    success: false,
                    message: '服务器内部错误'
                });
            }
        });

        // 验证令牌路由（用于中间件）
        this.router.get('/verify', async (req: Request, res: Response) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: '未提供认证令牌',
                        code: 'NO_TOKEN'
                    });
                }

                const user = await this.authService.validateToken(token);

                if (user) {
                    res.json({
                        success: true,
                        message: '令牌有效',
                        data: {
                            user: this.authService.getUserInfo(user)
                        }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        message: '无效或过期的认证令牌',
                        code: 'INVALID_TOKEN'
                    });
                }
            } catch (error) {
                console.error('Token verification error:', error);
                res.status(500).json({
                    success: false,
                    message: '服务器内部错误'
                });
            }
        });
    }

    // 认证中间件
    public authMiddleware() {
        return async (req: Request, res: Response, next: any) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: '未提供认证令牌',
                        code: 'NO_TOKEN'
                    });
                }

                const user = await this.authService.validateToken(token);

                if (user) {
                    // 将用户信息添加到请求对象中
                    (req as any).user = this.authService.getUserInfo(user);
                    next();
                } else {
                    res.status(401).json({
                        success: false,
                        message: '无效或过期的认证令牌',
                        code: 'INVALID_TOKEN'
                    });
                }
            } catch (error) {
                console.error('Auth middleware error:', error);
                res.status(500).json({
                    success: false,
                    message: '认证服务错误'
                });
            }
        };
    }

    public getRouter(): Router {
        return this.router;
    }

    public getAuthService(): AuthService {
        return this.authService;
    }

    public getUserStorage(): UserStorage {
        return this.authService.getUserStorage();
    }
}
