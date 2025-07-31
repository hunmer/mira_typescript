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
exports.LibraryHandler = void 0;
const MessageHandler_1 = require("./MessageHandler");
class LibraryHandler extends MessageHandler_1.MessageHandler {
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
                    case 'open':
                        // 初次握手,发送服务器所需字段信息
                        this.server.sendToWebsocket(this.ws, { eventName: 'try_connect', data: {
                                fields: this.dbService.pluginManager.fields, // 所有插件所需字段信息
                            } });
                        break;
                    case 'connect':
                        // 第二次握手 
                        this.server.broadcastPluginEvent('client::before_connect', {
                            message: this.message,
                            ws: this.ws,
                        }).then((ok) => __awaiter(this, void 0, void 0, function* () {
                            if (ok) {
                                const data = yield this.dbService.getLibraryInfo(); // 获取所有标签，文件夹等信息
                                this.server.sendToWebsocket(this.ws, { eventName: 'connected', data: data });
                                this.server.broadcastPluginEvent('client::connected', { libraryId });
                            }
                        }));
                        break;
                    case 'close':
                        result = yield this.dbService.closeLibrary();
                        break;
                    default:
                        throw new Error(`Unsupported library action: ${action}`);
                }
                this.sendResponse({});
            }
            catch (err) {
                this.sendError(err instanceof Error ? err.message : 'Library operation failed');
            }
        });
    }
}
exports.LibraryHandler = LibraryHandler;
