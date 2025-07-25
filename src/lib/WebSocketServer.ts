import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server } from 'http';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';
import { WebSocketRouter } from './WebSocketRouter';
import { getLibrarysJson } from './LibraryList';
import { ServerPluginManager } from './ServerPluginManager';
import { EventArgs } from './event-manager';
import { LibraryStorage } from './LibraryStorage';
import { MiraHttpServer } from './HttpServer';
import { MiraBackend } from './ServerExample';

interface LibraryClient {
  [libraryId: string]: WebSocket[];
}

export class MiraWebsocketServer {
  private port: number;
  private libraryClients: LibraryClient = {};
  private wss?: WSServer;
  libraries: LibraryStorage;
  private httpServer: MiraHttpServer;
  backend: MiraBackend;

  constructor(port: number, backend: MiraBackend) {
    this.port = port;
    this.backend = backend;
    this.httpServer = this.backend.httpServer;
    this.libraries = this.backend.libraries;
  }

  async start(basePath: string): Promise<void> {
    this.wss = new WSServer({ port: this.port });
    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    console.log(`[!]Serving at ws://localhost:${this.port}`);
  }

  broadcastToClients(eventName: string, eventData: Record<string, any>): void {
    const dbService = this.libraries.all().find(
      (library) => library.getLibraryId() === eventData.libraryId
    );
    if (dbService) {
      dbService.getEventManager().broadcast(
        eventName,
        new EventArgs(eventName, eventData)
      );
    }
  }

   sendToWebsocket(ws: WebSocket, data: Record<string, any>): void {
    console.log({response: data});
    ws.send(JSON.stringify(data));
  }

  broadcastPluginEvent(eventName: string, data: Record<string, any>): void {
    const dbService = this.libraries.all().find(
      (library) => library.getLibraryId() === data.libraryId
    );
    if (dbService) {
      dbService.getEventManager().broadcast(
        eventName,
        new EventArgs(eventName, data)
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
    const exists = this.libraries.exists(libraryId);

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
          service = await this.libraries.load(library);
        }else{
          service = this.libraries.get(libraryId)
          if(service == null) return;
        }
        const result = await service.connectLibrary(library);
        this.sendToWebsocket(ws, { eventName: 'connected', data: result });
        this.broadcastPluginEvent('client::connected', {libraryId: libraryId});
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

    const dbService = this.libraries.all().find(
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

  broadcastLibraryEvent(libraryId: string, eventName: string, data: Record<string, any>): void {
    const message = JSON.stringify({ eventName: eventName, data: data });
    if (this.libraryClients[libraryId]) {
      this.libraryClients[libraryId].forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }

  async stop(): Promise<void> {
    this.libraries.all().map(dbService => dbService.close());
    this.wss?.close();
    console.log('WebSocket server stopped');
  }
}