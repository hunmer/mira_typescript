import { MiraHttpServer, ILibraryServerData, ServerPluginManager, MiraWebsocketServer, ServerPlugin } from 'mira-app-core';

import { EventEmitter } from 'events';

class DemoPlugin extends ServerPlugin {
    private readonly server: MiraWebsocketServer;
    private readonly dbService: ILibraryServerData;
    protected readonly eventEmitter: EventEmitter;
    private readonly pluginManager: ServerPluginManager;

    constructor({pluginManager, server, dbService, httpServer}: {pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData, httpServer: MiraHttpServer}) {
        super('mira_demo', pluginManager, dbService, httpServer);
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