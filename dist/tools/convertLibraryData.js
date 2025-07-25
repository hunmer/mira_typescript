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
exports.LibraryDataConverter = void 0;
const LibraryServerDataSQLite_1 = require("../lib/LibraryServerDataSQLite");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const sqlite3_1 = require("sqlite3");
class LibraryDataConverter {
    constructor(libraryData) {
        this.libraryData = libraryData;
    }
    convertAndInsertData(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const maxItems = options.maxItems || Infinity;
                let processed = 0;
                const totalItems = Math.min(data.folders.length + data.tags.length + data.files.length, maxItems);
                // 转换并插入文件夹数据
                const folderMap = new Map();
                for (const folder of data.folders) {
                    const existingFolder = yield this.libraryData.getFolder(folder.id);
                    if (existingFolder) {
                        yield this.libraryData.updateFolder(folder.id, {
                            title: folder.title,
                            parent_id: folder.parent || null,
                        });
                        folderMap.set(folder.id, folder.id);
                    }
                    else {
                        const newFolderId = yield this.libraryData.createFolder({
                            id: folder.id,
                            title: folder.title,
                            parent_id: folder.parent || null,
                        });
                        folderMap.set(folder.id, newFolderId);
                    }
                    this.showProgress(processed, totalItems, 'folders');
                }
                // 转换并插入标签数据
                const tagMap = new Map();
                for (const tag of data.tags) {
                    const existingTag = yield this.libraryData.getTag(tag.id);
                    if (existingTag) {
                        yield this.libraryData.updateTag(tag.id, {
                            title: tag.title,
                            parent_id: tag.parent || null,
                        });
                        tagMap.set(tag.id, tag.id);
                    }
                    else {
                        const newTagId = yield this.libraryData.createTag({
                            id: tag.id,
                            title: tag.title,
                            parent_id: tag.parent || null,
                        });
                        tagMap.set(tag.id, newTagId);
                    }
                    this.showProgress(processed, totalItems, 'tags');
                }
                // 转换并插入文件数据
                const fileMap = new Map();
                const _getSourcePath = (md5, title) => {
                    return path.join(path.dirname(options.sourceDbPath), '/files/', `${md5.substring(0, 2)}/${md5.substring(2, 4)}/${md5}/`, title);
                };
                fs.mkdirSync(path.join(options.targetDir, 'thumbs'));
                for (const file of data.files) {
                    if (processed >= maxItems)
                        break;
                    const extName = path.extname(file.title).toLocaleLowerCase();
                    if (['.rar', '.zip'].includes(extName))
                        continue;
                    const urlMeta = data.urlMeta.find(m => m.fid === file.id);
                    const descMeta = data.descMeta.find(m => m.fid === file.id);
                    const tags = this.getTagIdsForFile(file.id, data.tagsMeta, tagMap);
                    const filePath = this.generateFilePath(file.title, file.link, folderMap);
                    const sourcePath = filePath != null && filePath != '' ? filePath : _getSourcePath(file.md5, file.title);
                    const itemData = {
                        name: file.title,
                        created_at: file.birthtime || file.date,
                        imported_at: Date.now(),
                        size: file.size,
                        hash: '', // 不保留hash
                        notes: descMeta === null || descMeta === void 0 ? void 0 : descMeta.desc,
                        folder_id: this.getFolderIdsForFile(file.id, data.foldersMeta, folderMap),
                        reference: urlMeta === null || urlMeta === void 0 ? void 0 : urlMeta.url,
                        path: filePath,
                        tags: tags != null && tags.length ? JSON.stringify(tags) : null,
                    };
                    try {
                        if (options.importType) {
                            // 复制文件
                            if (fs.existsSync(sourcePath)) {
                                let savePath = path.join(yield this.libraryData.getItemPath(itemData), itemData.name);
                                let counter = 1;
                                const originalName = itemData.name;
                                const extension = path.extname(originalName);
                                const basename = path.basename(originalName, extension);
                                while (fs.existsSync(savePath)) {
                                    itemData.name = `${basename} (${counter})${extension}`;
                                    savePath = path.join(yield this.libraryData.getItemPath(itemData), itemData.name);
                                    counter++;
                                }
                                const saveDir = path.dirname(savePath);
                                if (!fs.existsSync(saveDir)) {
                                    fs.mkdirSync(saveDir, { recursive: true });
                                }
                                if (options.importType == 'copy') {
                                    fs.copyFileSync(sourcePath, savePath);
                                }
                                else if (options.importType == 'move') {
                                    fs.renameSync(sourcePath, savePath);
                                }
                            }
                        }
                    }
                    catch (err) {
                        console.error(err);
                    }
                    const fileData = yield this.libraryData.createFile(itemData);
                    // 复制封面图
                    const coverFile = _getSourcePath(file.md5, 'cover.jpg');
                    try {
                        if (fs.existsSync(coverFile)) {
                            let savePath = yield this.libraryData.getItemThumbPath(fileData);
                            if (options.importType == 'copy') {
                                fs.copyFileSync(coverFile, savePath);
                            }
                            else if (options.importType == 'move') {
                                fs.renameSync(coverFile, savePath);
                            }
                        }
                    }
                    catch (err) {
                        console.error(err);
                    }
                    if (typeof fileData === 'number') {
                        fileMap.set(file.id, fileData);
                    }
                    processed++;
                    this.showProgress(processed, totalItems, 'files');
                }
                console.log(`\nData conversion completed (${processed}/${totalItems} items processed)`);
            }
            catch (error) {
                console.error('Error during data conversion:', error);
                throw error;
            }
        });
    }
    generateFilePath(title, link, folderMap) {
        if (!link)
            return null;
        // 如果link不为空，直接使用link作为path
        return link;
    }
    getFolderIdsForFile(fileId, foldersMeta, folderMap) {
        const meta = foldersMeta.find(m => m.fid === fileId);
        if (!(meta === null || meta === void 0 ? void 0 : meta.ids))
            return null;
        const ids = meta.ids.split('|')
            .filter(id => id !== '')
            .map(id => folderMap.get(parseInt(id)))
            .filter(id => id !== undefined);
        return ids.length > 0 ? ids[0] : null;
    }
    getTagIdsForFile(fileId, tagsMeta, tagMap) {
        const meta = tagsMeta.find(m => m.fid === fileId);
        if (!(meta === null || meta === void 0 ? void 0 : meta.ids))
            return null;
        return meta.ids.split('|')
            .filter(id => id !== '')
            .map(id => tagMap.get(parseInt(id)))
            .filter(id => id !== undefined)
            .map(id => id.toString());
    }
    // 从SQLite源数据库读取数据的函数
    readFromSourceDb(sourcePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const db = new sqlite3_1.Database(sourcePath);
            const [files, folders, tags, urlMeta, descMeta, foldersMeta, tagsMeta] = yield Promise.all([
                this.queryAll(db, 'SELECT * FROM files'),
                this.queryAll(db, 'SELECT * FROM folders'),
                this.queryAll(db, 'SELECT * FROM tags'),
                this.queryAll(db, 'SELECT * FROM url_meta'),
                this.queryAll(db, 'SELECT * FROM desc_meta'),
                this.queryAll(db, 'SELECT * FROM folders_meta'),
                this.queryAll(db, 'SELECT * FROM tags_meta')
            ]);
            db.close();
            return { files, folders, tags, urlMeta, descMeta, foldersMeta, tagsMeta };
        });
    }
    showProgress(current, total, type) {
        const percent = Math.floor((current / total) * 100);
        process.stdout.write(`\rProcessing ${type}: ${current}/${total} (${percent}%)` +
            (percent === 100 ? '\n' : ''));
    }
    queryAll(db, sql) {
        return new Promise((resolve, reject) => {
            db.all(sql, [], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
}
exports.LibraryDataConverter = LibraryDataConverter;
// 使用示例
function main(sourceDbPath, targetDir) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!sourceDbPath || !targetDir) {
            console.error('Usage: node convertLibraryData.js <sourceDbFile> <targetDir>');
            process.exit(1);
        }
        if (!fs.existsSync(sourceDbPath)) {
            console.error(`Source database not found: ${sourceDbPath}`);
            process.exit(1);
        }
        // 确保目标目录存在
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const config = {
            id: 'library-1',
            customFields: {
                path: targetDir,
            }
        };
        const libraryData = new LibraryServerDataSQLite_1.LibraryServerDataSQLite({}, config);
        yield libraryData.initialize();
        const converter = new LibraryDataConverter(libraryData);
        try {
            console.log('Reading data from source database...');
            const sourceData = yield converter.readFromSourceDb(sourceDbPath);
            console.log(`Found ${sourceData.files.length} files, ${sourceData.folders.length} folders, ${sourceData.tags.length} tags`);
            console.log('Converting and inserting data...');
            yield converter.convertAndInsertData(sourceData, { maxItems: undefined, sourceDbPath: sourceDbPath, targetDir: targetDir, importType: 'move' }); // 测试时可限制最大转换条数
            console.log(`Data conversion completed successfully. Database saved to: ${targetDir}`);
        }
        catch (error) {
            console.error('Data conversion failed:', error);
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
    main(args[0], args[1]).catch(console.error);
}
