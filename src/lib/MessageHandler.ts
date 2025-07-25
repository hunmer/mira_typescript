import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';
import { WebSocket } from 'ws';
import { WebSocketMessage } from './WebSocketRouter';

export abstract class MessageHandler {
  constructor(
    protected dbService: LibraryServerDataSQLite,
    protected ws: WebSocket,
    protected message: WebSocketMessage
  ) {}

  abstract handle(): Promise<void>;

  protected sendResponse(data: Record<string, any>): void {
    this.ws.send(JSON.stringify({
      requestId: this.message.requestId,
      status: 'ok',
      data
    }));
  }

  protected sendError(error: string): void {
    this.ws.send(JSON.stringify({
      requestId: this.message.requestId,
      status: 'error',
      error
    }));
  }

  protected getLibraryId(): string {
    return this.message.libraryId;
  }

  protected getAction(): string {
    return this.message.action;
  }

  protected getPayload(): Record<string, any> {
    return this.message.payload.data || {};
  }
}