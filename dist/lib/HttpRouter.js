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
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// 配置multer文件上传
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path_1.default.join(__dirname, '../../temp');
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    // limits: {
    //   fileSize: 100 * 1024 * 1024 // 限制100MB
    // }
});
class HttpRouter {
    constructor(bakend) {
        this.registerdRounters = new Map();
        this.libraryServices = [];
        this.backend = bakend;
        this.router = express_1.default.Router();
        this.setupRoutes();
    }
    registerRounter(path, method, router) {
        if (this.registerdRounters.has(path)) {
            return;
        }
        this.registerdRounters.set(path, router);
        console.log('register rounter', path, method);
        switch (method) {
            case 'post':
                this.router.post(path, router);
                break;
            case 'get':
                this.router.get(path, router);
                break;
            default:
                throw new Error('不支持的方法');
        }
    }
    unregisterRounter(path) {
        this.router.unlink(path);
    }
    setupRoutes() {
        this.router.post('/libraries/:libraryId/connect', (req, res) => __awaiter(this, void 0, void 0, function* () {
        }));
        this.router.get('/libraries/:libraryId/status', (req, res) => {
        });
        // 上传文件
        this.router.post('/libraries/upload', upload.array('files'), (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { libraryId, sourcePath } = req.body; // sourcePath是用户的本地文件位置，用来验证是否上传成功
            const clientId = req.body.clientId || null;
            const fields = req.body.fields ? JSON.parse(req.body.fields) : null;
            const payload = req.body.payload ? JSON.parse(req.body.payload) : null;
            const library = this.backend.libraries.get(libraryId);
            if (!library)
                return res.status(404).send('Library not found');
            // 解析上传的文件
            const files = req.files;
            if (!files || !files.length)
                return res.status(400).send('No files uploaded.');
            try {
                const results = [];
                for (const file of files) {
                    try {
                        // 确保临时目录存在
                        const tempDir = path_1.default.join(__dirname, '../../temp');
                        if (!fs_1.default.existsSync(tempDir)) {
                            fs_1.default.mkdirSync(tempDir, { recursive: true });
                        }
                        // 生成唯一文件名并保存文件
                        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                        const tempFilePath = path_1.default.join(tempDir, `${Date.now()}-${originalName}`);
                        // 确保有有效的文件数据
                        if (file.buffer) {
                            yield fs_1.default.promises.writeFile(tempFilePath, file.buffer);
                        }
                        else if (file.path) {
                            // 如果使用diskStorage，文件已保存到指定路径
                            yield fs_1.default.promises.copyFile(file.path, tempFilePath);
                        }
                        else {
                            throw new Error('No valid file data available');
                        }
                        const { tags, folder_id } = payload.data || {};
                        const fileData = {
                            name: req.body.name || originalName,
                            tags: JSON.stringify(tags || []),
                            folder_id: folder_id || null,
                        };
                        const result = yield library.createFileFromPath(tempFilePath, fileData, { importType: 'move' }); // 使用move上传完成后自动删除临时文件
                        results.push({
                            success: true,
                            file: tempFilePath,
                            result
                        });
                        // 发布公告
                        this.backend.webSocketServer.broadcastPluginEvent('file::created', {
                            message: {
                                type: 'file',
                                action: 'create',
                                fields, payload
                            }, result, libraryId
                        });
                        if (clientId) {
                            const ws = this.backend.webSocketServer.getWsClientById(libraryId, clientId);
                            ws && this.backend.webSocketServer.sendToWebsocket(ws, { eventName: 'file::uploaded', data: { path: sourcePath } });
                            this.backend.webSocketServer.broadcastLibraryEvent(libraryId, 'file::created', Object.assign(Object.assign({}, result), { libraryId }));
                        }
                    }
                    catch (error) {
                        results.push({
                            success: false,
                            file: file.path,
                            error: error instanceof Error ? error.message : String(error)
                        });
                    }
                }
                res.send({ results });
            }
            catch (error) {
                console.error('Error uploading files:', error);
                res.status(500).send('Internal server error while processing the upload.');
            }
        }));
        // 添加文件流路由
        this.router.get('/thumb/:libraryId/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const ret = yield this.parseLibraryItem(req, res);
                if (ret) {
                    const thumbPath = yield ret.library.getItemThumbPath(ret.item, { isNetworkImage: false });
                    if (!fs_1.default.existsSync(thumbPath))
                        return res.status(404).send('Thumbnail not found');
                    res.setHeader('Content-Type', 'image/png');
                    fs_1.default.createReadStream(thumbPath).pipe(res);
                }
            }
            catch (err) {
                console.error('Error serving thumbnail:', err);
                res.status(500).send('Internal server error');
            }
        }));
        this.router.get('/file/:libraryId/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
            const ret = yield this.parseLibraryItem(req, res);
            if (ret) {
                const filePath = yield ret.library.getItemFilePath(ret.item);
                if (!filePath || !fs_1.default.existsSync(filePath)) {
                    return res.status(404).send('File not found');
                }
                const fileExt = path_1.default.extname(filePath).toLowerCase();
                const contentType = this.getContentType(fileExt);
                res.setHeader('Content-Type', contentType);
                fs_1.default.createReadStream(filePath).pipe(res);
            }
        }));
    }
    parseLibraryItem(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { libraryId, id } = req.params;
            const library = this.backend.libraries.get(libraryId);
            if (!library) {
                res.status(404).send('Library not found');
                return;
            }
            const item = yield library.getFile(parseInt(id));
            if (!item) {
                res.status(404).send('Item not found');
                return;
            }
            return { library, item };
        });
    }
    getContentType(ext) {
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.json': 'application/json',
            '.mp4': 'video/mp4',
            '.mp3': 'audio/mpeg',
            '.zip': 'application/zip',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };
        return mimeTypes[ext] || 'application/octet-stream';
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
