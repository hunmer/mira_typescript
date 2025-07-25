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
exports.MiraWebsocketServer = void 0;
const ws_1 = require("ws");
const WebSocketRouter_1 = require("./WebSocketRouter");
const LibraryList_1 = require("./LibraryList");
const event_manager_1 = require("./event-manager");
class MiraWebsocketServer {
    constructor(port, backend) {
        this.libraryClients = {};
        this.port = port;
        this.backend = backend;
        this.httpServer = this.backend.httpServer;
        this.libraries = this.backend.libraries;
    }
    start(basePath) {
        return __awaiter(this, void 0, void 0, function* () {
            this.wss = new ws_1.WebSocketServer({ port: this.port });
            this.wss.on('connection', (ws) => {
                this.handleConnection(ws);
            });
            console.log(`[!]Serving at ws://localhost:${this.port}`);
        });
    }
    broadcastToClients(eventName, eventData) {
        const dbService = this.libraries.all().find((library) => library.getLibraryId() === eventData.libraryId);
        if (dbService) {
            dbService.getEventManager().broadcast(eventName, new event_manager_1.EventArgs(eventName, eventData));
        }
    }
    sendToWebsocket(ws, data) {
        console.log({ response: data });
        ws.send(JSON.stringify(data));
    }
    broadcastPluginEvent(eventName, data) {
        const dbService = this.libraries.all().find((library) => library.getLibraryId() === data.libraryId);
        if (dbService) {
            dbService.getEventManager().broadcast(eventName, new event_manager_1.EventArgs(eventName, data));
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
            const exists = this.libraries.exists(libraryId);
            if (action === 'open' && recordType === 'library') {
                const library = data.library;
                try {
                    var service;
                    if (!exists) {
                        const library = (yield (0, LibraryList_1.getLibrarysJson)()).find((lib) => lib.id === libraryId);
                        if (!library) {
                            return this.sendToWebsocket(ws, {
                                status: 'error',
                                msg: `Library not found`
                            });
                        }
                        service = yield this.libraries.load(library);
                    }
                    else {
                        service = this.libraries.get(libraryId);
                        if (service == null)
                            return;
                    }
                    const result = yield service.connectLibrary(library);
                    this.sendToWebsocket(ws, { eventName: 'connected', data: result });
                    this.broadcastPluginEvent('client::connected', { libraryId: libraryId });
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
            const dbService = this.libraries.all().find((library) => library.getLibraryId() === libraryId);
            if (!dbService) {
                this.sendToWebsocket(ws, {
                    status: 'error',
                    msg: 'Library service not found'
                });
                return;
            }
            const handler = yield WebSocketRouter_1.WebSocketRouter.route(this, dbService, ws, Object.assign(Object.assign({}, row), payload));
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
    broadcastLibraryEvent(libraryId, eventName, data) {
        const message = JSON.stringify({ eventName: eventName, data: data });
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
            this.libraries.all().map(dbService => dbService.close());
            (_a = this.wss) === null || _a === void 0 ? void 0 : _a.close();
            console.log('WebSocket server stopped');
        });
    }
}
exports.MiraWebsocketServer = MiraWebsocketServer;
