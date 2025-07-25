"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageHandler = void 0;
class MessageHandler {
    constructor(dbService, ws, message) {
        this.dbService = dbService;
        this.ws = ws;
        this.message = message;
    }
    sendResponse(data) {
        this.ws.send(JSON.stringify({
            requestId: this.message.requestId,
            status: 'ok',
            data
        }));
    }
    sendError(error) {
        this.ws.send(JSON.stringify({
            requestId: this.message.requestId,
            status: 'error',
            error
        }));
    }
    getLibraryId() {
        return this.message.libraryId;
    }
    getAction() {
        return this.message.action;
    }
    getPayload() {
        return this.message.payload.data || {};
    }
}
exports.MessageHandler = MessageHandler;
