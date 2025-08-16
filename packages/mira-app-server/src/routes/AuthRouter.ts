import { Router, Request, Response } from 'express';
import { UserStorage, User } from '../UserStorage';

class AuthService {
    private userStorage: UserStorage;

    constructor(dataDir: string = './data') {
        this.userStorage = new UserStorage(dataDir);
    }

    async initialize(): Promise<void> {
        return this.userStorage.initialize();
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
        return this.authService.initialize();
    }

    private setupRoutes(): void {

        // 获取权限码路由 - 符合vben框架标准
        this.router.get('/codes', async (req: Request, res: Response) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return res.status(401).json({
                        code: 401,
                        message: '未提供认证令牌',
                        data: []
                    });
                }

                const authService = this.getAuthService();
                const user = await authService.validateToken(token);

                if (user) {
                    // 根据用户角色返回权限码
                    let accessCodes: string[] = [];

                    if (user.role === 'administrator') {
                        // 管理员拥有所有权限
                        accessCodes = [
                            'AC_100100', // 超级管理员权限
                            'AC_100010', // 管理员权限
                            'AC_100020', // 用户管理权限
                            'AC_100030', // 系统设置权限
                            'AC_200000', // 数据库访问权限
                            'AC_300000', // 设备管理权限
                            'AC_400000', // 文件管理权限
                        ];
                    } else if (user.role === 'user') {
                        // 普通用户权限
                        accessCodes = [
                            'AC_100010', // 基础用户权限
                            'AC_200001', // 数据库查看权限
                            'AC_300001', // 设备查看权限
                        ];
                    }

                    res.json({
                        code: 0,
                        message: '获取权限码成功',
                        data: accessCodes
                    });
                } else {
                    res.status(401).json({
                        code: 401,
                        message: '无效或过期的认证令牌',
                        data: []
                    });
                }
            } catch (error) {
                console.error('Get access codes error:', error);
                res.status(500).json({
                    code: 500,
                    message: '服务器内部错误',
                    data: []
                });
            }
        });

        // 登录路由
        this.router.post('/login', async (req: Request, res: Response) => {
            try {
                const { username, password } = req.body;

                console.log('📝 Login attempt:', { username, passwordLength: password?.length });

                if (!username || !password) {
                    return res.status(400).json({
                        code: 400,
                        message: '用户名和密码不能为空',
                        data: null
                    });
                }

                const user = await this.authService.authenticateUser(username, password);

                if (user) {
                    const token = await this.authService.generateToken(user.id);

                    // 符合vben框架标准的返回格式
                    res.json({
                        code: 0,  // 0表示成功
                        message: '登录成功',
                        data: {
                            accessToken: token  // vben期望的token字段名
                        }
                    });

                    console.log(`✅ User ${username} logged in successfully`);
                } else {
                    res.status(401).json({
                        code: 401,
                        message: '用户名或密码错误',
                        data: null
                    });

                    console.log(`❌ Failed login attempt for username: ${username}`);
                }
            } catch (error) {
                console.error('Login error:', error);
                res.status(500).json({
                    code: 500,
                    message: '服务器内部错误',
                    data: null
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
