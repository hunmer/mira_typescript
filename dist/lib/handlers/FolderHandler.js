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
exports.FolderHandler = void 0;
const MessageHandler_1 = require("./MessageHandler");
class FolderHandler extends MessageHandler_1.MessageHandler {
    constructor(server, dbService, ws, message) {
        super(server, dbService, ws, message);
    }
    handle() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { action, payload } = this.message;
                const { data } = payload;
                let result;
                switch (action) {
                    case 'all':
                        result = yield this.dbService.getAllFolders();
                        break;
                    case 'read':
                        result = yield this.dbService.queryFolder(data.query);
                        break;
                    case 'create':
                        result = yield this.dbService.createFolder(data);
                        break;
                    case 'update':
                        result = yield this.dbService.updateFolder(data.id, data);
                        break;
                    case 'delete':
                        result = yield this.dbService.deleteFolder(data.id);
                        break;
                    default:
                        throw new Error(`Unsupported folder action: ${action}`);
                }
                this.sendResponse({ result });
            }
            catch (err) {
                this.sendError(err instanceof Error ? err.message : 'Folder operation failed');
            }
        });
    }
}
exports.FolderHandler = FolderHandler;
