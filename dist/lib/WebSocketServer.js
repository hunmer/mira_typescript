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
            this.wss.on('connection', (ws, request) => {
                var _a;
                const urlString = (_a = request.url) !== null && _a !== void 0 ? _a : '';
                const url = new URL(urlString, `ws://${request.headers.host}`);
                const clientId = url.searchParams.get('clientId');
                const libraryId = url.searchParams.get('libraryId');
                if (clientId == null || libraryId == null) {
                    console.error('Missing clientId or libraryId in WebSocket connection');
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
        });
    }
    broadcastToClients(eventName, eventData) {
        const dbService = this.libraries.all().find((library) => library.getLibraryId() === eventData.libraryId);
        if (dbService) {
            const eventManager = dbService.getEventManager();
            eventManager.broadcast(eventName, new event_manager_1.EventArgs(eventName, eventData));
        }
    }
    getWsClientById(libraryId, clientId) {
        const clients = this.libraryClients[libraryId];
        if (clients) {
            return clients.find((client) => client.clientId === clientId);
        }
    }
    showDialogToWeboscket(ws, data) {
        this.sendToWebsocket(ws, {
            eventName: 'dialog', data: Object.assign({
                title: '提示',
                message: '',
                url: ''
            }, data)
        });
    }
    sendToWebsocket(ws, data) {
        console.log({ response: data });
        ws.send(JSON.stringify(data));
    }
    broadcastPluginEvent(eventName, data) {
        var _a, _b;
        const libraryId = (_a = data === null || data === void 0 ? void 0 : data.libraryId) !== null && _a !== void 0 ? _a : (_b = data === null || data === void 0 ? void 0 : data.message) === null || _b === void 0 ? void 0 : _b.libraryId;
        const dbService = this.libraries.all().find((library) => library.getLibraryId() === libraryId);
        if (dbService) {
            const eventManager = dbService.getEventManager();
            return eventManager.broadcast(eventName, new event_manager_1.EventArgs(eventName, data));
        }
        return Promise.resolve(false);
    }
    handleConnection(ws) {
        ws.on('message', (message) => __awaiter(this, void 0, void 0, function* () {
            try {
                const data = JSON.parse(message);
                console.log('Incoming message:', data);
                yield this.handleMessage(ws, data);
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
                const index = this.libraryClients[libraryId].findIndex(client => client === ws);
                console.log({ index });
                if (index !== -1) {
                    this.libraryClients[libraryId].splice(index, 1);
                }
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
