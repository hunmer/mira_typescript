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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpRouter = void 0;
const express_1 = __importDefault(require("express"));
const LibraryServerDataSQLite_1 = require("./LibraryServerDataSQLite");
const LibraryService_1 = require("./LibraryService");
class HttpRouter {
    constructor() {
        this.libraryServices = [];
        this.router = express_1.default.Router();
        this.setupRoutes();
    }
    setupRoutes() {
        this.router.post('/libraries/:libraryId/connect', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { libraryId } = req.params;
                const libraryConfig = req.body;
                const existingService = this.libraryServices.find(service => service.getLibraryId() === libraryId);
                if (existingService) {
                    return res.json({ status: 'connected', data: existingService.getLibraryInfo() });
                }
                const dbService = new LibraryServerDataSQLite_1.LibraryServerDataSQLite(this, libraryConfig);
                yield dbService.initialize();
                this.libraryServices.push(dbService);
                const service = new LibraryService_1.LibraryService(dbService);
                const result = yield service.connectLibrary(libraryConfig);
                res.json({ status: 'connected', result });
            }
            catch (err) {
                res.status(500).json({
                    status: 'error',
                    message: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        }));
        this.router.get('/libraries/:libraryId/status', (req, res) => {
            const { libraryId } = req.params;
            const service = this.libraryServices.find(service => service.getLibraryId() === libraryId);
            if (!service) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Library not found'
                });
            }
            res.json({
                status: 'ok',
                data: service.getLibraryInfo()
            });
        });
        // Add more routes as needed
    }
    getRouter() {
        return this.router;
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(this.libraryServices.map(service => service.close()));
            this.libraryServices = [];
        });
    }
}
exports.HttpRouter = HttpRouter;
