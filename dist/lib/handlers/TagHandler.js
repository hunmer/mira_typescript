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
exports.TagHandler = void 0;
const MessageHandler_1 = require("./MessageHandler");
class TagHandler extends MessageHandler_1.MessageHandler {
    constructor(server, dbService, ws, message) {
        super(server, dbService, ws, message);
    }
    handle() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { action, payload } = this.message;
                const { data } = payload;
                const libraryId = this.dbService.getLibraryId();
                let result;
                switch (action) {
                    case 'file_set':
                        var { fileId, tags } = data;
                        if (yield this.dbService.setFileTags(fileId, tags)) {
                            result = { fileId, tags, libraryId };
                            this.server.broadcastPluginEvent('file::setTag', result);
                            this.server.broadcastLibraryEvent(libraryId, 'file::setTag', result);
                        }
                        break;
                    case 'file_get':
                        var { fileId } = data;
                        result = { tags: yield this.dbService.getFileTags(fileId) };
                        break;
                    case 'all':
                        result = yield this.dbService.getAllTags();
                        break;
                    case 'read':
                        result = yield this.dbService.queryTag(data.query);
                        break;
                    case 'create':
                        result = yield this.dbService.createTag(data);
                        break;
                    case 'update':
                        result = yield this.dbService.updateTag(data.id, data);
                        break;
                    case 'delete':
                        var { id } = data;
                        if (yield this.dbService.deleteTag(data.id)) {
                            result = { id };
                            this.server.broadcastPluginEvent('tag::deleted', { id, libraryId });
                            this.server.sendToWebsocket(this.ws, { eventName: 'file::deleted', data: { id, libraryId } });
                        }
                        break;
                    default:
                        throw new Error(`Unsupported tag action: ${action}`);
                }
                this.sendResponse(result);
            }
            catch (err) {
                this.sendError(err instanceof Error ? err.message : 'Tag operation failed');
            }
        });
    }
}
exports.TagHandler = TagHandler;
