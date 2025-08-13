import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server } from 'http';
import { LibraryServerDataSQLite } from 'mira-storage-sqlite';
import { WebSocketRouter } from './WebSocketRouter';
import { ServerPluginManager } from './ServerPluginManager';
import { EventArgs } from './event-manager';
import { LibraryStorage } from './LibraryStorage';
import { MiraBackend } from './MiraBackend';

interface LibraryClient {
  [libraryId: string]: WebSocket[];
}


export class MiraWebsocketServer {
  private port: number;
  private libraryClients: LibraryClient = {};
  private wss?: WSServer;
  libraries: LibraryStorage;
  backend: MiraBackend;

  constructor(port: number, backend: MiraBackend) {
    this.port = port;
    this.backend = backend;
    this.libraries = this.backend.libraries;
  }

  async start(basePath: string): Promise<void> {
    this.wss = new WSServer({ port: this.port });
    this.wss.on('connection', (ws: WebSocket, request) => {
      const urlString = request.url ?? '';
      const url = new URL(urlString, `ws://${request.headers.host}`);
      const clientId = url.searchParams.get('clientId');
      const libraryId = url.searchParams.get('libraryId');
      if (clientId == null || libraryId == null) {
        return ws.close();
      }

      // 将请求信息保存到 ws 对象上
      Object.assign(ws, {
        clientId: clientId,
        libraryId: libraryId,
        requestInfo: {
          url: request.url,
          headers: request.headers,
          remoteAddress: request.socket.remoteAddress
        }
      });

      // 保存连接
      if (!this.libraryClients[libraryId]) {
        this.libraryClients[libraryId] = [];
      }
      if (!this.libraryClients[libraryId].includes(ws)) {
        this.libraryClients[libraryId].push(ws);
      }

      this.handleConnection(ws);
    });

    console.log(`[!]Serving at ws://localhost:${this.port}`);
  }

  broadcastToClients(eventName: string, eventData: Record<string, any>): void {
    const obj = this.libraries.get(eventData.libraryId);
    if (obj) {
      const eventManager = obj.eventManager;
      if (eventManager) {
        eventManager.broadcast(
          eventName,
          new EventArgs(eventName, eventData)
        );
      }
    }
  }

  getWsClientById(libraryId: string, clientId: string): WebSocket | undefined {
    const clients = this.libraryClients[libraryId];
    if (clients) {
      return clients.find((client) => (client as any).clientId === clientId);
    }
  }

  showDialogToWeboscket(ws: WebSocket, data: Record<string, any>): void {
    this.sendToWebsocket(ws, {
      eventName: 'dialog', data: Object.assign({
        title: '提示',
        message: '',
        url: ''
      }, data)
    });
  }

  sendToWebsocket(ws: WebSocket, data: Record<string, any>): void {
    ws.send(JSON.stringify(data));
  }

  broadcastPluginEvent(eventName: string, data: Record<string, any>): Promise<boolean> {
    const libraryId = data?.libraryId ?? data?.message?.libraryId;
    const obj = this.libraries.get(libraryId);
    if (obj) {
      const eventManager = obj.eventManager;
      if (eventManager) {
        return eventManager.broadcast(
          eventName,
          new EventArgs(eventName, data)
        );
      }
    }
    return Promise.resolve(false);
  }

  private handleConnection(ws: WebSocket): void {
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        await this.handleMessage(ws, data);
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
        const index = this.libraryClients[libraryId].findIndex(
          client => client === ws
        );
        console.log({ index });
        if (index !== -1) {
          this.libraryClients[libraryId].splice(index, 1);
        }
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
    if (!exists) {
      this.sendToWebsocket(ws, {
        status: 'error',
        msg: 'Library not found!'
      });
      return;
    }

    const obj = this.libraries.get(libraryId);
    if (!obj) {
      this.sendToWebsocket(ws, {
        status: 'error',
        msg: 'Library service not found'
      });
      return;
    }

    const handler = await WebSocketRouter.route(this, obj.libraryService, ws, {
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
    this.libraries.clear();
    this.wss?.close();
    console.log('WebSocket server stopped');
  }
}