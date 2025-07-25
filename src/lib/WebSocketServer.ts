import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server } from 'http';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';
import { LibraryService } from './LibraryService';
import { WebSocketRouter } from './WebSocketRouter';
import { getLibrarysJson } from './LibraryList';

interface LibraryClient {
  [libraryId: string]: WebSocket[];
}

interface ServerEventArgs {
  eventName: string;
  data: any;
}

export class MiraServer {
  private port: number;
  private libraryClients: LibraryClient = {};
  private connecting: boolean = false;
  private libraryServices: LibraryServerDataSQLite[] = [];
  private server?: Server;
  private wss?: WSServer;

  constructor(port: number) {
    this.port = port;
  }

  async loadLibrary(dbConfig: Record<string, any>): Promise<LibraryServerDataSQLite> {
    const dbServer = new LibraryServerDataSQLite(this, dbConfig);
    await dbServer.initialize();
    this.libraryServices.push(dbServer);
    return dbServer;
  }

  private getLibraryService(libraryId: string): LibraryService {
    const dbService = this.libraryServices.find(
      (library) => library.getLibraryId() === libraryId
    );
    if (!dbService) throw new Error(`Library ${libraryId} not found`);
    return new LibraryService(dbService);
  }

  libraryExists(libraryId: string): boolean {
    return this.libraryServices.some(
      (library) => library.getLibraryId() === libraryId
    );
  }

  get isConnecting(): boolean {
    return this.connecting;
  }

  async start(basePath: string): Promise<void> {
    this.wss = new WSServer({ port: this.port });
    this.connecting = true;

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    console.log(`[!]Serving at ws://localhost:${this.port}`);
  }

  broadcastToClients(eventName: string, eventData: Record<string, any>): void {
    const dbService = this.libraryServices.find(
      (library) => library.getLibraryId() === eventData.libraryId
    );
    if (dbService) {
      dbService.getEventManager().broadcastToClients(
        eventName,
        { eventName, data: eventData }
      );
    }
  }

   sendToWebsocket(ws: WebSocket, data: Record<string, any>): void {
    console.log({response: data});
    ws.send(JSON.stringify(data));
  }

  broadcastPluginEvent(eventName: string, data: Record<string, any>): void {
    const dbService = this.libraryServices.find(
      (library) => library.getLibraryId() === data.libraryId
    );
    if (dbService) {
      dbService.getEventManager().broadcast(
        eventName,
        { eventName, data }
      );
    }
  }

  private handleConnection(ws: WebSocket): void {
    console.log('New client connected');
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log('Incoming message:', data)
        await this.handleMessage(ws, data);
        
        // 保存连接
        if (data.libraryId) {
          const libraryId = data.libraryId;
          if (!this.libraryClients[libraryId]) {
            this.libraryClients[libraryId] = [];
          }
          if (!this.libraryClients[libraryId].includes(ws)) {
            this.libraryClients[libraryId].push(ws);
          }
        }
      } catch (e) {
        this.sendToWebsocket(ws, {
          error: 'Invalid message format',
          details: e instanceof Error ? e.message : String(e)
        });
      }
    });

    ws.on('close', () => {
      // Remove from all library client lists
      Object.keys(this.libraryClients).forEach(libraryId => {
        this.libraryClients[libraryId] = this.libraryClients[libraryId].filter(
          client => client !== ws
        );
      });
    });
  }

  private async handleMessage(ws: WebSocket, row: Record<string, any>): Promise<void> {
    const payload = row.payload || {};
    const action = row.action;
    const requestId = row.requestId;
    const libraryId = row.libraryId;
    const data = payload.data || {};
    const recordType = payload.type;
    const exists = this.libraryExists(libraryId);

    if (action === 'open' && recordType === 'library') {
      const library = data.library;
      try {
        var service;
        if(!exists){
          const library = (await getLibrarysJson()).find((lib: Record<string, any>) => lib.id === libraryId );
          if(!library){
            return this.sendToWebsocket(ws, {
              status: 'error',
              msg: `Library not found`
            });
          }
          service = new LibraryService(await this.loadLibrary(library));
        }else{
          service =  this.getLibraryService(libraryId)
        }
        const result = await service.connectLibrary(library);
        this.sendToWebsocket(ws, { event: 'connected', data: result });
      } catch (err) {
        this.sendToWebsocket(ws, {
          status: 'error',
          msg: `Library load error: ${err instanceof Error ? err.message : String(err)}`
        });
      }
      return;
    }

    if (!exists) {
      this.sendToWebsocket(ws, {
        status: 'error',
        msg: 'Library not found!'
      });
      return;
    }

    const dbService = this.libraryServices.find(
      (library) => library.getLibraryId() === libraryId
    );

    if (!dbService) {
      this.sendToWebsocket(ws, {
        status: 'error',
        msg: 'Library service not found'
      });
      return;
    }

    const handler = await WebSocketRouter.route(this, dbService, ws, {
      ...row,
      ...payload
    });

    if (handler) {
      await handler.handle();
    } else {
      this.sendToWebsocket(ws, {
        status: 'error',
        message: `Unsupported action: ${action} and record type: ${recordType}`,
        requestId
      });
    }
  }

  broadcastLibraryEvent(libraryId: string, eventName: string, args: ServerEventArgs): void {
    const message = JSON.stringify({ event: eventName, data: args });

    if (this.libraryClients[libraryId]) {
      this.libraryClients[libraryId].forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }

  async stop(): Promise<void> {
    await Promise.all(this.libraryServices.map(dbService => dbService.close()));
    this.wss?.close();
    this.connecting = false;
    this.libraryServices = [];
    console.log('WebSocket server stopped');
  }
}