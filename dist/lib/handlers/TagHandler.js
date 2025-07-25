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
    constructor(dbService, ws, message) {
        super(dbService, ws, message);
    }
    handle() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { action, payload } = this.message;
                const { data } = payload;
                let result;
                switch (action) {
                    case 'query':
                        result = yield this.dbService.queryTag(data.query);
                        break;
                    case 'create':
                        result = yield this.dbService.createTag(data);
                        break;
                    case 'update':
                        result = yield this.dbService.updateTag(data.id, data);
                        break;
                    case 'delete':
                        result = yield this.dbService.deleteTag(data.id);
                        break;
                    default:
                        throw new Error(`Unsupported tag action: ${action}`);
                }
                this.sendResponse({ data: result });
            }
            catch (err) {
                this.sendError(err instanceof Error ? err.message : 'Tag operation failed');
            }
        });
    }
}
exports.TagHandler = TagHandler;
