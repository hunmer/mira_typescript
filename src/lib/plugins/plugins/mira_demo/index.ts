import { ILibraryServerData } from "../../../ILibraryServerData";
import { MiraWebsocketServer } from "../../../WebSocketServer";
import { EventEmitter } from 'events';

class DemoPlugin {
    private readonly server: MiraWebsocketServer;
    private readonly dbService: ILibraryServerData;
    private readonly eventEmitter: EventEmitter;

    constructor(server: MiraWebsocketServer, dbService: ILibraryServerData) {
        this.server = server;
        this.dbService = dbService;
        this.eventEmitter = dbService.getEventManager();
        console.log('Demo plugin initialized');
        // this.eventEmitter.on('client::connected', this.onClientConnected.bind(this));
    }

    private async onClientConnected(args: any): Promise<void> {
        console.log('Client connected:', args);
    }
}


export function init(server: MiraWebsocketServer, dbService: ILibraryServerData): DemoPlugin {
    return new DemoPlugin(server, dbService);
}
