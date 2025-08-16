import { Router, Request, Response } from 'express';
import { AuthRouter } from './AuthRouter';

export class UserRouter {
    private router: Router;
    private authRouter: AuthRouter;

    constructor(authRouter: AuthRouter) {
        this.router = Router();
        this.authRouter = authRouter;
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // 获取用户信息路由 - 符合vben框架标准 (/api/user/info)
        this.router.get('/info', async (req: Request, res: Response) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return res.status(401).json({
                        code: 401,
                        message: '未提供认证令牌',
                        data: null
                    });
                }

                const authService = this.authRouter.getAuthService();
                const user = await authService.validateToken(token);

                if (user) {
                    const userInfo = authService.getUserInfo(user);
                    // 符合vben标准的用户信息格式
                    const vbenUserInfo = {
                        ...userInfo,
                        realName: userInfo.username, // vben期望的真实姓名字段
                        roles: [userInfo.role], // vben期望的角色数组
                        // 添加更多用户信息字段以符合vben标准
                        avatar: '', // 头像URL，可选
                        desc: userInfo.role === 'administrator' ? '超级管理员' : '普通用户', // 用户描述
                        homePath: '/dashboard', // 默认首页路径
                    };

                    res.json({
                        code: 0,
                        message: '获取用户信息成功',
                        data: vbenUserInfo
                    });
                } else {
                    res.status(401).json({
                        code: 401,
                        message: '无效或过期的认证令牌',
                        data: null
                    });
                }
            } catch (error) {
                console.error('Get user info error:', error);
                res.status(500).json({
                    code: 500,
                    message: '服务器内部错误',
                    data: null
                });
            }
        });


        // 更新用户信息路由
        this.router.put('/info', async (req: Request, res: Response) => {
            try {
                const token = req.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return res.status(401).json({
                        code: 401,
                        message: '未提供认证令牌',
                        data: null
                    });
                }

                const authService = this.authRouter.getAuthService();
                const user = await authService.validateToken(token);

                if (user) {
                    // 这里可以添加更新用户信息的逻辑
                    // 目前返回成功消息
                    res.json({
                        code: 0,
                        message: '用户信息更新成功',
                        data: null
                    });
                } else {
                    res.status(401).json({
                        code: 401,
                        message: '无效或过期的认证令牌',
                        data: null
                    });
                }
            } catch (error) {
                console.error('Update user info error:', error);
                res.status(500).json({
                    code: 500,
                    message: '服务器内部错误',
                    data: null
                });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
