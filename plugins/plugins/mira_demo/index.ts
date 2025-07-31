import { MiraHttpServer } from "../../../HttpServer";
import { ILibraryServerData } from "../../../ILibraryServerData";
import { ServerPluginManager } from "../../../ServerPluginManager";
import { MiraWebsocketServer } from "../../../WebSocketServer";
import { EventEmitter } from 'events';

class DemoPlugin {
    private readonly server: MiraWebsocketServer;
    private readonly dbService: ILibraryServerData;
    private readonly eventEmitter: EventEmitter;
    private readonly pluginManager: ServerPluginManager;

    constructor({pluginManager, server, dbService, httpServer}: {pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData, httpServer: MiraHttpServer}) {
        this.server = server;
        this.dbService = dbService;
        this.pluginManager = pluginManager;
        this.eventEmitter = dbService.getEventManager()!;
        console.log('Demo plugin initialized');
        // this.eventEmitter.on('client::connected', this.onClientConnected.bind(this));
    }

    private async onClientConnected(args: any): Promise<void> {
        console.log('Client connected:', args);
    }
}

export function init(inst: any): DemoPlugin {
    return new DemoPlugin(inst);
}