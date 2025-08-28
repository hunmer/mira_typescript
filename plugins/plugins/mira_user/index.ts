//  通过sdk连接登录系统，进行资源请求的权限验证
import { ServerPluginManager, MiraWebsocketServer, ServerPlugin, express } from 'mira-app-server';
import { ILibraryServerData } from 'mira-storage-sqlite';
import path from "path";
import { MiraClient } from 'mira-server-sdk';

class UserPlugin extends ServerPlugin {
    private server: MiraWebsocketServer;
    private dbService: ILibraryServerData;
    private miraClient: MiraClient;
    private logined_clients: string[] = [];

    constructor({ pluginManager, server, dbService, miraClient }: { pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData, miraClient: MiraClient }) {
        super('mira_user', pluginManager, dbService);
        this.server = server;
        this.dbService = dbService;
        this.miraClient = miraClient;
        console.log('mira_user plugin initialized');

        // 注册所需的字段
        pluginManager.registerFields([
            { action: 'connect', type: 'library', field: 'username' },
            { action: 'connect', type: 'library', field: 'password' },
        ]);

        // 获取 httpServer 和 backend
        const backend = pluginManager.server.backend;
        const httpServer = backend.getHttpServer();
        // 开放登录页面
        httpServer.app
            .use('/user', express.static(path.join(pluginManager.getPluginDir('mira_user'), 'web')) as any);

        const libraryId = dbService.getLibraryId();
        // 登录接口
        httpServer.httpRouter.registerRounter(libraryId, '/user/login', 'post', async (req: any, res: any) => {
            try {
                const { username, password, libraryId, clientId } = req.body;
                if (!username || !password) {
                    res.status(400).json({ success: false, message: '请输入账号和密码' });
                    return;
                }
                // 使用 SDK 登录
                const loginResult = await this.miraClient.auth().login(username, password);
                if (!loginResult || !loginResult.accessToken) {
                    res.status(401).json({ success: false, message: '账号或密码错误' });
                    return;
                }
                this.onLogined({ ws: this.server.getWsClientById(libraryId, clientId), libraryId, username, password })
                res.status(200).json({
                    success: true,
                    message: '登录成功',
                    data: { username }
                });
            } catch (error) {
                console.error('登录错误:', error);
                res.status(500).json({ success: false, message: '服务器内部错误' });
            }
        });

        // 注册接口
        httpServer.httpRouter.registerRounter(libraryId, '/user/register', 'post', async (req: any, res: any) => {
            try {
                const { username, password } = req.body;
                if (!username || !password) {
                    res.status(400).json({ success: false, message: '请输入账号和密码' });
                    return;
                }
                if (password.length < 6) {
                    res.status(400).json({ success: false, message: '密码长度不能少于6位' });
                    return;
                }
                // 使用 SDK 注册 - 如果SDK支持注册功能
                const registerResult = await this.miraClient.auth().register(username, password);
                if (registerResult) {
                    res.status(200).json({
                        success: true,
                        message: '注册成功',
                        data: { username }
                    });
                }
            } catch (error) {
                console.error('注册错误:', error);
                res.status(500).json({ success: false, message: (error as any).message || '服务器内部错误' });
            }
        });

        // 退出登录接口
        httpServer.httpRouter.registerRounter(libraryId, '/user/logout', 'post', async (req: any, res: any) => {
            try {
                const { libraryId, clientId, username } = req.body;
                // 从已登录客户端列表中移除
                if (clientId) {
                    const index = this.logined_clients.indexOf(clientId);
                    if (index > -1) {
                        this.logined_clients.splice(index, 1);
                    }
                    // 通知客户端清除登录状态
                    const ws = this.server.getWsClientById(libraryId, clientId);
                    if (ws) {
                        this.server.sendToWebsocket(ws, {
                            eventName: 'setFields',
                            libraryId,
                            data: { fields: { username: null, password: null } }
                        });
                        this.server.sendToWebsocket(ws, {
                            eventName: 'logout',
                            libraryId,
                            data: { message: '已退出登录' }
                        });
                    }
                }
                // 广播用户断开连接事件
                if (username && libraryId) {
                    this.server.broadcastPluginEvent('user::disconnected', { username, libraryId });
                }
                res.status(200).json({
                    success: true,
                    message: '退出登录成功'
                });
            } catch (error) {
                console.error('退出登录错误:', error);
                res.status(500).json({ success: false, message: '服务器内部错误' });
            }
        });

        // 绑定登录前事件
        const obj = backend.libraries!.getLibrary(dbService.getLibraryId());
        if (obj) {
            obj.eventManager.on('client::before_connect', this.onUserLogin.bind(this));
        }
    }

    // 登录页面地址生成函数
    private getLoginUrl({ libraryId, clientId }: { libraryId: string, clientId: string }) {
        return this.dbService.getPublicURL(`user/index.html?libraryId=${libraryId}&clientId=${clientId}`)
    }

    // 用户登录事件处理函数
    private async onUserLogin(event: any): Promise<boolean> {
        const { message, ws } = event.args;
        const { libraryId, clientId, fields } = message;
        if (this.logined_clients.includes(clientId)) {
            return true;
        }
        const { username, password } = fields;
        const url = this.getLoginUrl({ libraryId, clientId });
        if (username == null || password == null) {
            this.server.showDialogToWeboscket(ws, {
                title: '登录',
                message: '请输入账号和密码',
                url
            });
            return false;
        }
        // 使用 SDK 登录校验
        try {
            const loginResult = await this.miraClient.auth().login(username, password);
            if (!loginResult || !loginResult.accessToken) {
                this.server.showDialogToWeboscket(ws, {
                    title: '登录',
                    message: '账号和密码错误',
                    url
                });
                return false;
            }
            this.onLogined({ ws, libraryId: message.libraryId, username, password })
            return true;
        } catch (error) {
            this.server.showDialogToWeboscket(ws, {
                title: '登录',
                message: '账号和密码错误',
                url
            });
            return false;
        }
    }

    // 登录成功后的处理函数
    private async onLogined({ ws, libraryId, username, password }: { ws: any, libraryId: string, username: string, password: string }) {
        if (ws) {
            // 客户端保存字段信息
            this.server.sendToWebsocket(ws, {
                eventName: 'setFields',
                libraryId,
                data: { fields: { username, password } }
            });
            // 客户端重新获取素材库信息
            const data = await this.dbService.getLibraryInfo(); // 获取所有标签，文件夹等信息
            this.server.sendToWebsocket(ws, { eventName: 'connected', data: data });
            this.server.broadcastPluginEvent('client::connected', { libraryId });
        }
        this.logined_clients.push(ws.clientId);
        this.server.broadcastPluginEvent('user::connected', { username, libraryId });
    }
}


export function init(inst: any): UserPlugin {
    return new UserPlugin(inst);
}
