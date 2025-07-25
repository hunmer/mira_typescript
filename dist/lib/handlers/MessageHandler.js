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
        const response = JSON.stringify(Object.assign(Object.assign({}, this.message), { payload: Object.assign(Object.assign({}, this.message.payload), { data }) }));
        console.log({ response });
        this.ws.send(response);
    }
    sendError(error) {
        const response = JSON.stringify(Object.assign(Object.assign({}, this.message), { status: 'error', error }));
        console.log({ response });
        this.ws.send(response);
    }
}
exports.MessageHandler = MessageHandler;
