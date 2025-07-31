"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.PathFilesImporter = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const LibraryServerDataSQLite_1 = require("../lib/LibraryServerDataSQLite");
class PathFilesImporter {
    constructor(libraryData) {
        this.libraryData = libraryData;
    }
    importFilesFromPath(sourcePath_1) {
        return __awaiter(this, arguments, void 0, function* (sourcePath, options = {}) {
            yield this.libraryData.initialize();
            try {
                if (!fs.existsSync(sourcePath)) {
                    throw new Error(`Source path does not exist: ${sourcePath}`);
                }
                const stats = fs.statSync(sourcePath);
                if (stats.isFile()) {
                    yield this.importSingleFile(sourcePath, sourcePath, options);
                }
                else {
                    yield this.importDirectoryFiles(sourcePath, sourcePath, options);
                }
            }
            catch (error) {
                console.error('Error during file import:', error);
                throw error;
            }
        });
    }
    importDirectoryFiles(sourcePath, dirPath, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = fs.readdirSync(dirPath);
            let processed = 0;
            for (const file of files) {
                const fullPath = path.join(dirPath, file);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    yield this.importDirectoryFiles(sourcePath, fullPath, options);
                }
                else if (stats.isFile()) {
                    yield this.importSingleFile(sourcePath, fullPath, options);
                    processed++;
                    process.stdout.write(`\rProcessed ${processed} files`);
                }
            }
        });
    }
    importSingleFile(sourcePath, filePath, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const extName = path.extname(filePath).toLocaleLowerCase();
            if (['.db'].includes(extName))
                return;
            const stats = fs.statSync(filePath);
            const fileName = path.basename(filePath);
            // 处理文件夹层级
            const folderPath = this.getLimitedFolderPath(sourcePath, filePath, options.maxFolderDepth);
            const folderId = yield this.getOrCreateFolder(sourcePath, folderPath);
            // 准备文件数据
            const fileData = {
                name: fileName,
                created_at: Math.floor(stats.birthtimeMs / 1000),
                imported_at: Math.floor(Date.now() / 1000),
                size: stats.size,
                hash: '',
                notes: '',
                folder_id: folderId,
                reference: '',
                path: filePath, // 使用完整路径
                tags: null
            };
            // 插入文件记录
            yield this.libraryData.createFile(fileData);
            // 处理文件移动/复制
            if (options.importType) {
                try {
                    // 确保目标路径正确
                    const targetDir = yield this.libraryData.getItemPath(fileData);
                    if (!targetDir) {
                        throw new Error('Failed to get target directory path');
                    }
                    const savePath = path.join(targetDir, fileData.name);
                    const saveDir = path.dirname(savePath);
                    if (!fs.existsSync(saveDir)) {
                        try {
                            fs.mkdirSync(saveDir, { recursive: true });
                        }
                        catch (err) { }
                    }
                    console.log(filePath);
                    if (options.importType === 'copy') {
                        fs.copyFileSync(filePath, savePath);
                    }
                    else if (options.importType === 'move') {
                        fs.renameSync(filePath, savePath);
                    }
                }
                catch (err) {
                    console.error(`Failed to ${options.importType} file: ${filePath}`, err);
                }
            }
        });
    }
    getLimitedFolderPath(sourcePath, filePath, maxDepth) {
        if (maxDepth === undefined || maxDepth <= 0) {
            return path.dirname(filePath);
        }
        const parts = path.dirname(filePath).replace(sourcePath, '').split(path.sep).filter(p => p !== '.' && p !== '');
        return parts.slice(0, Math.min(maxDepth, parts.length)).join(path.sep);
    }
    getOrCreateFolder(sourcePath, folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!folderPath || folderPath === '.' || folderPath === path.sep) {
                return null;
            }
            // 规范化路径并分割
            const parts = folderPath.replace(sourcePath, '').split(path.sep).filter(p => p);
            let currentParentId = null;
            for (const part of parts) {
                // 检查文件夹是否已存在
                const existingFolder = yield this.libraryData.findFolderByName(part, currentParentId);
                if (existingFolder) {
                    currentParentId = existingFolder.id;
                    continue;
                }
                // 创建新文件夹
                console.log({ msg: 'create_folder', part, parts });
                const newFolderId = yield this.libraryData.createFolder({
                    title: part,
                    parent_id: currentParentId
                });
                currentParentId = newFolderId;
            }
            return currentParentId;
        });
    }
}
exports.PathFilesImporter = PathFilesImporter;
// 使用示例
function main(sourcePath, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!sourcePath) {
            console.error('Usage: ts-node pathFilesToLibrary.ts <sourcePath> <targetDbPath> [maxFolderDepth]');
            process.exit(1);
        }
        const config = {
            id: 'library-1',
            customFields: {
                path: options === null || options === void 0 ? void 0 : options.targetDbPath
            }
        };
        const libraryData = new LibraryServerDataSQLite_1.LibraryServerDataSQLite({}, config);
        yield libraryData.initialize();
        const importer = new PathFilesImporter(libraryData);
        try {
            console.log('Importing files...');
            yield importer.importFilesFromPath(sourcePath, options);
            console.log('\nFile import completed successfully.');
        }
        catch (error) {
            console.error('File import failed:', error);
            process.exit(1);
        }
        finally {
            yield libraryData.close();
        }
    });
}
// 如果是直接执行此文件而不是被导入
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        importType: 'move', // 默认为复制
        targetDbPath: args[1],
        maxFolderDepth: args[2] ? parseInt(args[2]) : undefined,
    };
    main(args[0], options).catch(console.error);
}
