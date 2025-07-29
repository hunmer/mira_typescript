import { MiraHttpServer } from "../../../HttpServer";
import { ILibraryServerData } from "../../../ILibraryServerData";
import { ServerPluginManager } from "../../../ServerPluginManager";
import { MiraWebsocketServer } from "../../../WebSocketServer";
import express from 'express';
import { ServerPlugin } from "../../../ServerPlugin";
import path from "path";

class DingTalkRobot extends ServerPlugin {
    private readonly server: MiraWebsocketServer;
    private httpServer: MiraHttpServer;
    private dbService: ILibraryServerData;
    private userList: Record<string, any>[] = [];

    constructor({ pluginManager, server, dbService, httpServer }: { pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData, httpServer: MiraHttpServer }) {
        super('dingtalk_robot', dbService.getEventManager());
        this.server = server;
        this.dbService = dbService;
        this.httpServer = httpServer;
        this.loadConfig({
            // dingnfvobzppogfk5z6q
            clientId: 'dingnfvobzppogfk5z6q',
            clientSecret: 'ee30TpxKJK1uMsh9ZjoFcm_2hpEsfndssVi8Ed20AfyW9z035oNFh9IsnkUejn_G'
        })
        console.log('dingtalk_robot plugin initialized');

        // 发送消息接口
        httpServer.getRouter().registerRounter('/dingtalk_robot/send', 'post', async (req, res) => {
            try {
                const { username, password, libraryId, clientId } = req.body;
            } catch (error) {
                console.error('登录错误:', error);
                res.status(500).json({ success: false, message: '服务器内部错误' });
            }
        });
    }
}


export function init(inst: any): DingTalkRobot {
    return new DingTalkRobot(inst);
}
