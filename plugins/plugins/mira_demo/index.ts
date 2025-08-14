import { ServerPluginManager, ServerPlugin, MiraWebsocketServer } from 'mira-app-core';
import { EventEmitter } from 'events';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraHttpServer } from 'mira-server/dist/HttpServer';

class DemoPlugin extends ServerPlugin {
    private readonly server: MiraWebsocketServer;
    private readonly dbService: ILibraryServerData;
    private readonly pluginManager: ServerPluginManager;

    constructor({ pluginManager, server, dbService, httpServer }: { pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData, httpServer: MiraHttpServer }) {
        super('mira_demo', pluginManager, dbService);
        this.server = server;
        this.dbService = dbService;
        this.pluginManager = pluginManager;
        console.log('Demo plugin initialized');
    }

    private async onClientConnected(args: any): Promise<void> {
        console.log('Client connected:', args);
    }
}

export function init(inst: any): DemoPlugin {
    return new DemoPlugin(inst);
}