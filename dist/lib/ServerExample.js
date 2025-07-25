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
exports.MiraBackend = void 0;
const WebSocketServer_1 = require("./WebSocketServer");
const HttpServer_1 = require("./HttpServer");
const LibraryStorage_1 = require("./LibraryStorage");
class MiraBackend {
    constructor() {
        this.libraries = new LibraryStorage_1.LibraryStorage(this);
        this.httpServer = new HttpServer_1.MiraHttpServer(3000, this);
        this.webSocketServer = new WebSocketServer_1.MiraWebsocketServer(8081, this);
        this.webSocketServer.start('/ws');
        // 处理退出
        process.on('SIGINT', () => __awaiter(this, void 0, void 0, function* () {
            console.log('Shutting down servers...');
            yield this.webSocketServer.stop();
            yield this.httpServer.stop();
            process.exit();
        }));
    }
}
exports.MiraBackend = MiraBackend;
const app = new MiraBackend();
