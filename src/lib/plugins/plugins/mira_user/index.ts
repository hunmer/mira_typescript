import { ILibraryServerData } from "../../../ILibraryServerData";
import { ServerPluginManager } from "../../../ServerPluginManager";
import { MiraWebsocketServer } from "../../../WebSocketServer";
import { EventEmitter } from 'events';

class UserPlugin {
    private readonly server: MiraWebsocketServer;
    private readonly dbService: ILibraryServerData;
    private readonly eventEmitter: EventEmitter;
    private readonly pluginManager: ServerPluginManager;
    // require "username" "password"
    private userList: Record<string, any>[];

    constructor(pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData) {
        this.server = server;
        this.dbService = dbService;
        this.pluginManager = pluginManager;
        this.eventEmitter = dbService.getEventManager();
        console.log('mira_user plugin initialized');
        // this.eventEmitter.on('plugin::user_login', this.onUserLogin.bind(this));
        pluginManager.registerFields([
            {action: 'connect', type: 'library', field: 'username'},
            {action: 'connect', type: 'library', field: 'password'},
        ])
        this.userList = [
            {
                'username': 'user1',
                'password': 'pass1'
            },
            {
                'username': 'user2',
                'password': 'pass2'
            }
        ]
        this.eventEmitter.on('client::before_connect', this.onUserLogin.bind(this));
        
    }


    private async onUserLogin(event: any): Promise<boolean> {
        console.log('onUserLogin:', event);
        const {message, ws} = event.args;
        const {username, password} = message.fields;
        if(username == null || password == null){
            this.server.showDialogToWeboscket(ws, {
                title: '登录',
                message: '请输入账号和密码',
                url: 'https://www.baidu.com'
            });
            return false;
        }
        const user = this.findUser(username, password);
        if (!user) {
            this.server.showDialogToWeboscket(ws, {
                title: '登录',
                message: '账号和密码错误',
                 url: 'https://www.baidu.com'
            });
            return false;
        }
        this.server.broadcastPluginEvent('user::connected', {username: username});
        return true;
    }

    // findUser
    private findUser(username: string, password: string): boolean {
        const user = this.userList.find((u) => u.username === username && u.password === password);
        return !!user;
    }

}


export function init(pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData): UserPlugin {
    return new UserPlugin(pluginManager, server, dbService);
}
