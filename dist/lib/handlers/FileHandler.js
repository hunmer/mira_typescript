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
exports.FileHandler = void 0;
const MessageHandler_1 = require("./MessageHandler");
class FileHandler extends MessageHandler_1.MessageHandler {
    constructor(server, dbService, ws, message) {
        super(server, dbService, ws, message);
    }
    handle() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const message = this.message;
                const { action, payload } = message;
                const { data } = payload;
                const libraryId = message.libraryId;
                let result;
                switch (action) {
                    case 'read':
                        result = yield this.dbService.getFiles({ filters: data.query, isUrlFile: this.dbService.config['useHttpFile'] ? true : false });
                        break;
                    case 'create':
                        const path = data.path;
                        result = path != null ? yield this.dbService.createFileFromPath(path, data) : yield this.dbService.createFile(data);
                        this.server.broadcastPluginEvent('file::created', { message, result, libraryId });
                        this.server.sendToWebsocket(this.ws, { eventName: 'file::uploaded', data: { path } });
                        this.server.broadcastLibraryEvent(libraryId, 'file::created', result);
                        break;
                    case 'update':
                        result = yield this.dbService.updateFile(data.id, data);
                        break;
                    case 'recover':
                        var { id } = data;
                        if (yield this.dbService.recoverFile(id)) {
                            this.server.broadcastPluginEvent('file::recovered', { id, libraryId });
                            this.server.sendToWebsocket(this.ws, { eventName: 'file::recovered', data: { id, libraryId } });
                        }
                        break;
                    case 'delete':
                        var { id, moveToRecycleBin } = data;
                        if (yield this.dbService.deleteFile(id, { moveToRecycleBin })) {
                            this.server.broadcastPluginEvent('file::deleted', { id, libraryId });
                            this.server.sendToWebsocket(this.ws, { eventName: 'file::deleted', data: { id, libraryId } });
                        }
                        break;
                    default:
                        throw new Error(`Unsupported file action: ${action}`);
                }
                this.sendResponse(result);
            }
            catch (err) {
                this.sendError(err instanceof Error ? err.message : 'File operation failed');
            }
        });
    }
}
exports.FileHandler = FileHandler;
