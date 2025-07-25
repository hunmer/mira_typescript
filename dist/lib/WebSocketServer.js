"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const ws_1 = require("ws");
const LibraryServerDataSQLite_1 = require("./LibraryServerDataSQLite");
const LibraryService_1 = require("./LibraryService");
const WebSocketRouter_1 = require("./WebSocketRouter");
class WebSocketServer {
    constructor(port) {
        this.libraryClients = {};
        this.connecting = false;
        this.libraryServices = [];
        this.port = port;
    }
    loadLibrary(dbConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbServer = new LibraryServerDataSQLite_1.LibraryServerDataSQLite(this, dbConfig);
            yield dbServer.initialize();
            this.libraryServices.push(dbServer);
            return dbServer;
        });
    }
    getLibraryService(libraryId) {
        const dbService = this.libraryServices.find((library) => library.getLibraryId() === libraryId);
        if (!dbService)
            throw new Error(`Library ${libraryId} not found`);
        return new LibraryService_1.LibraryService(dbService);
    }
    libraryExists(libraryId) {
        return this.libraryServices.some((library) => library.getLibraryId() === libraryId);
    }
    get isConnecting() {
        return this.connecting;
    }
    start(basePath) {
        return __awaiter(this, void 0, void 0, function* () {
            this.wss = new ws_1.WebSocketServer({ port: this.port });
            this.connecting = true;
            this.wss.on('connection', (ws) => {
                this.handleConnection(ws);
            });
            console.log(`[!]Serving at ws://localhost:${this.port}`);
        });
    }
    broadcastToClients(eventName, eventData) {
        const dbService = this.libraryServices.find((library) => library.getLibraryId() === eventData.libraryId);
        if (dbService) {
            dbService.getEventManager().broadcastToClients(eventName, { eventName, data: eventData });
        }
    }
    sendToWebsocket(ws, data) {
        ws.send(JSON.stringify(data));
    }
    broadcastPluginEvent(eventName, data) {
        const dbService = this.libraryServices.find((library) => library.getLibraryId() === data.libraryId);
        if (dbService) {
            dbService.getEventManager().broadcast(eventName, { eventName, data });
        }
    }
    handleConnection(ws) {
        console.log('New client connected');
        ws.on('message', (message) => __awaiter(this, void 0, void 0, function* () {
            try {
                const data = JSON.parse(message);
                console.log('Incoming message:', data);
                yield this.handleMessage(ws, data);
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
            }
            catch (e) {
                this.sendToWebsocket(ws, {
                    error: 'Invalid message format',
                    details: e instanceof Error ? e.message : String(e)
                });
            }
        }));
        ws.on('close', () => {
            // Remove from all library client lists
            Object.keys(this.libraryClients).forEach(libraryId => {
                this.libraryClients[libraryId] = this.libraryClients[libraryId].filter(client => client !== ws);
            });
        });
    }
    handleMessage(ws, row) {
        return __awaiter(this, void 0, void 0, function* () {
            const payload = row.payload || {};
            const action = row.action;
            const requestId = row.requestId;
            const libraryId = row.libraryId;
            const data = payload.data || {};
            const recordType = payload.type;
            const exists = this.libraryExists(libraryId);
            if (action === 'open' && recordType === 'library' && !exists) {
                const library = data.library;
                try {
                    const dbService = yield this.loadLibrary(library);
                    const service = new LibraryService_1.LibraryService(dbService);
                    const result = yield service.connectLibrary(library);
                    this.sendToWebsocket(ws, { event: 'connected', data: result });
                }
                catch (err) {
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
            const dbService = this.libraryServices.find((library) => library.getLibraryId() === libraryId);
            if (!dbService) {
                this.sendToWebsocket(ws, {
                    status: 'error',
                    msg: 'Library service not found'
                });
                return;
            }
            const handler = yield WebSocketRouter_1.WebSocketRouter.route(dbService, ws, Object.assign(Object.assign({}, row), payload));
            if (handler) {
                yield handler.handle();
            }
            else {
                this.sendToWebsocket(ws, {
                    status: 'error',
                    message: `Unsupported action: ${action} and record type: ${recordType}`,
                    requestId
                });
            }
        });
    }
    broadcastLibraryEvent(libraryId, eventName, args) {
        const message = JSON.stringify({ event: eventName, data: args });
        if (this.libraryClients[libraryId]) {
            this.libraryClients[libraryId].forEach(client => {
                if (client.readyState === ws_1.WebSocket.OPEN) {
                    client.send(message);
                }
            });
        }
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield Promise.all(this.libraryServices.map(dbService => dbService.close()));
            (_a = this.wss) === null || _a === void 0 ? void 0 : _a.close();
            this.connecting = false;
            this.libraryServices = [];
            console.log('WebSocket server stopped');
        });
    }
}
exports.WebSocketServer = WebSocketServer;
