import { MiraHttpServer, ServerPluginManager, MiraWebsocketServer, ServerPlugin } from 'mira-app-core';
import { ILibraryServerData } from 'mira-storage-sqlite';
import express from 'express';
import path from "path";

class UserPlugin extends ServerPlugin {
    private server: MiraWebsocketServer;
    private dbService: ILibraryServerData;

    constructor({ pluginManager, server, dbService, httpServer }: { pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData, httpServer: MiraHttpServer }) {
        super('mira_user', pluginManager, dbService, httpServer);
        this.server = server;
        this.dbService = dbService;
        console.log('mira_user plugin initialized');

        // 注册所需的字段
        pluginManager.registerFields([
            { action: 'connect', type: 'library', field: 'username' },
            { action: 'connect', type: 'library', field: 'password' },
        ]);

        // 开放登录页面
        httpServer.app
            .use('/user', express.static(path.join(pluginManager.getPluginDir('mira_user'), 'web')))

        const libraryId = dbService.getLibraryId();
        // 登录接口
        httpServer.getRouter().registerRounter(libraryId,'/user/login', 'post', async (req, res, next) => {
            try {
                const { username, password, libraryId, clientId } = req.body;
                if (!username || !password) {
                    res.status(400).json({ success: false, message: '请输入账号和密码' });
                    return;
                }
                const user = this.findUser(username, password);
                if (!user) {
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
            next();
        });

        // 注册接口
        httpServer.getRouter().registerRounter(libraryId,'/user/register', 'post', async (req, res, next) => {
            try {
                const { username, password, libraryId, clientId } = req.body;
                if (!username || !password) {
                    res.status(400).json({ success: false, message: '用户名和密码不能为空' });
                    return;
                }
                if (this.getUsers().some((u: any) => u.username === username)) {
                    res.status(400).json({ success: false, message: '用户名已存在' });
                    return;
                }

                this.getUsers().push({ username, password });
                this.saveUsersToJson();
                this.onLogined({ ws: this.server.getWsClientById(libraryId, clientId), libraryId, username, password })
                res.status(200).json({
                    success: true,
                    message: '注册成功',
                    data: { username }
                });
            } catch (error) {
                console.error('注册错误:', error);
                res.status(500).json({ success: false, message: '服务器内部错误' });
            }
            next();
        });

        // 获取所有用户接口
        httpServer.getRouter().registerRounter(libraryId,'/user/list', 'get', async (req, res, next) => {
            res.status(200).json(this.getUsers().map((u: any) => ({ username: u.username })));
            next();
        });

        // 绑定登录前事件
        const obj = httpServer.libraries.get(dbService.getLibraryId());
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
        const user = this.findUser(username, password);
        if (!user) {
            this.server.showDialogToWeboscket(ws, {
                title: '登录',
                message: '账号和密码错误',
                url
            });
            return false;
        }
        this.onLogined({ ws, libraryId: message.libraryId, username, password })
        return true;
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
        this.server.broadcastPluginEvent('user::connected', { username, libraryId });
    }

    private findUser(username: string, password: string): boolean {
        const user = this.getUsers().find((u: any) => u.username === username && u.password === password);
        return !!user;
    }

    private saveUsersToJson() {
        this.writeJson('users.json', this.getUsers());
    }

    // 可能回被其他插件调用，所以实时获取最新内容
    private getUsers() {
        return this.readJson('users.json');
    }
}


export function init(inst: any): UserPlugin {
    return new UserPlugin(inst);
}
