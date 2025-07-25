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
exports.WebSocketRouter = void 0;
const FileHandler_1 = require("./handlers/FileHandler");
const TagHandler_1 = require("./handlers/TagHandler");
const FolderHandler_1 = require("./handlers/FolderHandler");
const LibraryHandler_1 = require("./handlers/LibraryHandler");
class WebSocketRouter {
    static route(dbService, ws, message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { payload } = message;
            // 根据资源类型路由到不同的处理器
            switch (payload.type) {
                case 'file':
                    return new FileHandler_1.FileHandler(dbService, ws, message);
                case 'tag':
                    return new TagHandler_1.TagHandler(dbService, ws, message);
                case 'folder':
                    return new FolderHandler_1.FolderHandler(dbService, ws, message);
                case 'library':
                    return new LibraryHandler_1.LibraryHandler(dbService, ws, message);
                default:
                    return null;
            }
        });
    }
}
exports.WebSocketRouter = WebSocketRouter;
