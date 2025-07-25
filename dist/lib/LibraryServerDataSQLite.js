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
exports.LibraryServerDataSQLite = void 0;
const sqlite3_1 = require("sqlite3");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class LibraryServerDataSQLite {
    constructor(server, config) {
        var _a, _b;
        this.db = null;
        this.inTransaction = false;
        this.server = server;
        this.config = config;
        this.enableHash = (_b = (_a = config.customFields) === null || _a === void 0 ? void 0 : _a.enableHash) !== null && _b !== void 0 ? _b : false;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            // 初始化数据库连接和表结构
            const dbPath = path.join(yield this.getLibraryPath(), 'library_data.db');
            this.db = new sqlite3_1.Database(dbPath);
            // 创建文件表
            yield this.executeSql(`
      CREATE TABLE IF NOT EXISTS files(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        imported_at INTEGER NOT NULL,
        size INTEGER NOT NULL,
        hash TEXT NOT NULL,
        custom_fields TEXT,
        notes TEXT,
        stars INTEGER DEFAULT 0,
        folder_id INTEGER,
        reference TEXT,
        path TEXT,
        thumb INTEGER DEFAULT 0,
        recycled INTEGER DEFAULT 0,
        tags TEXT,
        FOREIGN KEY(folder_id) REFERENCES folders(id)
      )
    `);
            // 创建文件夹表
            yield this.executeSql(`
      CREATE TABLE IF NOT EXISTS folders(
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        parent_id INTEGER,
        color INTEGER,
        icon TEXT,
        FOREIGN KEY(parent_id) REFERENCES folders(id)
      )
    `);
            // 创建标签表
            yield this.executeSql(`
      CREATE TABLE IF NOT EXISTS tags(
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        parent_id INTEGER,
        color INTEGER,
        icon INTEGER,
        FOREIGN KEY(parent_id) REFERENCES tags(id)
      )
    `);
        });
    }
    // 文件操作方法实现
    createFile(fileData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const result = yield this.runSql(`INSERT INTO files(
        name, created_at, imported_at, size, hash, 
        custom_fields, notes, stars, folder_id,
        reference, path, thumb, recycled, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                fileData.name,
                fileData.created_at,
                fileData.imported_at,
                fileData.size,
                fileData.hash,
                fileData.custom_fields,
                fileData.notes,
                (_a = fileData.stars) !== null && _a !== void 0 ? _a : 0,
                fileData.folder_id,
                fileData.reference,
                fileData.path,
                (_b = fileData.thumb) !== null && _b !== void 0 ? _b : 0,
                (_c = fileData.recycled) !== null && _c !== void 0 ? _c : 0,
                fileData.tags,
            ]);
            return Object.assign({ id: result.lastID }, fileData);
        });
    }
    updateFile(id, fileData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const fields = [];
            const params = [];
            const addField = (key, value) => {
                if (fileData[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    params.push(value);
                }
            };
            addField('name', fileData.name);
            addField('created_at', fileData.created_at);
            addField('imported_at', fileData.imported_at);
            addField('size', fileData.size);
            addField('hash', fileData.hash);
            addField('custom_fields', fileData.custom_fields);
            addField('notes', fileData.notes);
            addField('stars', (_a = fileData.stars) !== null && _a !== void 0 ? _a : 0);
            addField('tags', fileData.tags);
            addField('folder_id', fileData.folder_id);
            addField('reference', fileData.reference);
            addField('path', fileData.path);
            addField('thumb', (_b = fileData.thumb) !== null && _b !== void 0 ? _b : 0);
            addField('recycled', (_c = fileData.recycled) !== null && _c !== void 0 ? _c : 0);
            if (fields.length === 0)
                return false;
            const query = `UPDATE files SET ${fields.join(', ')} WHERE id = ?`;
            params.push(id);
            const result = yield this.runSql(query, params);
            return result.changes > 0;
        });
    }
    deleteFile(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = (options === null || options === void 0 ? void 0 : options.moveToRecycleBin)
                ? 'UPDATE files SET recycled = 1 WHERE id = ?'
                : 'DELETE FROM files WHERE id = ?';
            const result = yield this.runSql(query, [id]);
            return result.changes > 0;
        });
    }
    recoverFile(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.runSql('UPDATE files SET recycled = 0 WHERE id = ?', [id]);
            return result.changes > 0;
        });
    }
    getFile(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.getSql('SELECT * FROM files WHERE id = ? LIMIT 1', [id]);
            return rows.length > 0 ? this.rowToMap(rows[0]) : null;
        });
    }
    getFiles(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const select = (options === null || options === void 0 ? void 0 : options.select) || '*';
            const filters = (options === null || options === void 0 ? void 0 : options.filters) || {};
            const whereClauses = [];
            const params = [];
            const folderId = parseInt(((_a = filters.folder) === null || _a === void 0 ? void 0 : _a.toString()) || '0') || 0;
            const tagIds = Array.isArray(filters.tags) ? filters.tags : [];
            const limit = parseInt(((_b = filters.limit) === null || _b === void 0 ? void 0 : _b.toString()) || '100') || 100;
            const offset = parseInt(((_c = filters.offset) === null || _c === void 0 ? void 0 : _c.toString()) || '0') || 0;
            // 构建查询条件
            if (filters.recycled !== undefined) {
                whereClauses.push('recycled = ?');
                params.push(filters.recycled ? 1 : 0);
            }
            if (filters.star !== undefined) {
                whereClauses.push('stars >= ?');
                params.push(filters.star);
            }
            if (filters.name) {
                whereClauses.push('name LIKE ?');
                params.push(`%${filters.name}%`);
            }
            if (filters.dateRange) {
                whereClauses.push('created_at BETWEEN ? AND ?');
                params.push(filters.dateRange.start.getTime(), filters.dateRange.end.getTime());
            }
            if (filters.minSize !== undefined) {
                whereClauses.push('size >= ?');
                params.push(filters.minSize * 1024);
            }
            if (filters.maxSize !== undefined) {
                whereClauses.push('size <= ?');
                params.push(filters.maxSize * 1024);
            }
            if (filters.minRating !== undefined) {
                whereClauses.push('stars >= ?');
                params.push(filters.minRating);
            }
            if (folderId !== 0) {
                whereClauses.push('folder_id = ?');
                params.push(folderId);
            }
            if (tagIds.length > 0) {
                whereClauses.push(`(
        SELECT COUNT(*) FROM json_each(tags) 
        WHERE value IN (${tagIds.map(() => '?').join(',')})
      ) = ${tagIds.length}`);
                params.push(...tagIds);
            }
            const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
            const query = `SELECT ${select} FROM files ${where} LIMIT ? OFFSET ?`;
            const countQuery = `SELECT COUNT(*) as total FROM files ${where}`;
            const [rows, countRows] = yield Promise.all([
                this.getSql(query, [...params, limit, offset]),
                this.getSql(countQuery, params),
            ]);
            return {
                result: rows.map(row => this.rowToMap(row)),
                limit,
                offset,
                total: countRows[0].total,
            };
        });
    }
    // 文件夹操作方法
    createFolder(folderData) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.runSql('INSERT INTO folders(id, title, parent_id, color, icon) VALUES (?, ?, ?, ?, ?)', [
                folderData.id,
                folderData.title,
                folderData.parent_id,
                folderData.color,
                folderData.icon,
            ]);
            return result.lastID;
        });
    }
    updateFolder(id, folderData) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.runSql('UPDATE folders SET title = ?, parent_id = ?, color = ?, icon = ? WHERE id = ?', [
                folderData.title,
                folderData.parent_id,
                folderData.color,
                folderData.icon,
                id,
            ]);
            return result.changes > 0;
        });
    }
    deleteFolder(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.beginTransaction();
            try {
                // 递归删除子文件夹
                const children = yield this.getFolders({ parentId: id });
                for (const child of children) {
                    yield this.deleteFolder(child.id);
                }
                // 更新文件的folder_id为null
                yield this.runSql('UPDATE files SET folder_id = NULL WHERE folder_id = ?', [id]);
                // 删除文件夹
                const result = yield this.runSql('DELETE FROM folders WHERE id = ?', [id]);
                yield this.commitTransaction();
                return result.changes > 0;
            }
            catch (err) {
                yield this.rollbackTransaction();
                throw err;
            }
        });
    }
    getFolder(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.getSql('SELECT * FROM folders WHERE id = ? LIMIT 1', [id]);
            return rows.length > 0 ? this.rowToMap(rows[0]) : null;
        });
    }
    findFolderByName(name, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = parentId !== undefined && parentId !== null
                ? 'SELECT * FROM folders WHERE title = ? AND parent_id = ? LIMIT 1'
                : 'SELECT * FROM folders WHERE title = ? AND parent_id IS NULL LIMIT 1';
            const params = parentId !== undefined && parentId !== null
                ? [name, parentId]
                : [name];
            const rows = yield this.getSql(query, params);
            return rows.length > 0 ? this.rowToMap(rows[0]) : null;
        });
    }
    getFolders(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const parentId = options === null || options === void 0 ? void 0 : options.parentId;
            const limit = (options === null || options === void 0 ? void 0 : options.limit) || 100;
            const offset = (options === null || options === void 0 ? void 0 : options.offset) || 0;
            const where = parentId !== undefined ? 'WHERE parent_id = ?' : 'WHERE parent_id IS NULL';
            const params = parentId !== undefined ? [parentId, limit, offset] : [limit, offset];
            const query = `SELECT * FROM folders ${where} LIMIT ? OFFSET ?`;
            const rows = yield this.getSql(query, params);
            return rows.map(row => this.rowToMap(row));
        });
    }
    // 标签操作方法
    createTag(tagData) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.runSql('INSERT INTO tags(id, title, parent_id, color, icon) VALUES (?, ?, ?, ?, ?)', [
                tagData.id,
                tagData.title,
                tagData.parent_id,
                tagData.color,
                tagData.icon,
            ]);
            return result.lastID;
        });
    }
    updateTag(id, tagData) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.runSql('UPDATE tags SET title = ?, parent_id = ?, color = ?, icon = ? WHERE id = ?', [
                tagData.title,
                tagData.parent_id,
                tagData.color,
                tagData.icon,
                id,
            ]);
            return result.changes > 0;
        });
    }
    deleteTag(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.beginTransaction();
            try {
                // 递归删除子标签
                const children = yield this.getTags({ parentId: id });
                for (const child of children) {
                    yield this.deleteTag(child.id);
                }
                // 删除标签
                const result = yield this.runSql('DELETE FROM tags WHERE id = ?', [id]);
                yield this.commitTransaction();
                return result.changes > 0;
            }
            catch (err) {
                yield this.rollbackTransaction();
                throw err;
            }
        });
    }
    getTag(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.getSql('SELECT * FROM tags WHERE id = ? LIMIT 1', [id]);
            return rows.length > 0 ? this.rowToMap(rows[0]) : null;
        });
    }
    getTags(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const parentId = options === null || options === void 0 ? void 0 : options.parentId;
            const limit = (options === null || options === void 0 ? void 0 : options.limit) || 100;
            const offset = (options === null || options === void 0 ? void 0 : options.offset) || 0;
            const where = parentId !== undefined ? 'WHERE parent_id = ?' : 'WHERE parent_id IS NULL';
            const params = parentId !== undefined ? [parentId, limit, offset] : [limit, offset];
            const query = `SELECT * FROM tags ${where} LIMIT ? OFFSET ?`;
            const rows = yield this.getSql(query, params);
            return rows.map(row => this.rowToMap(row));
        });
    }
    // 事务管理
    beginTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.inTransaction) {
                yield this.executeSql('BEGIN TRANSACTION');
                this.inTransaction = true;
            }
        });
    }
    commitTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.inTransaction) {
                yield this.executeSql('COMMIT');
                this.inTransaction = false;
            }
        });
    }
    rollbackTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.inTransaction) {
                yield this.executeSql('ROLLBACK');
                this.inTransaction = false;
            }
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.db) {
                this.db.close();
                this.db = null;
            }
        });
    }
    createFileFromPath(filePath, fileMeta, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File does not exist: ${filePath}`);
            }
            const stat = fs.statSync(filePath);
            const hash = this.enableHash ? this.calculateFileHashSync(filePath) : '';
            const fileData = Object.assign({ path: filePath, name: path.basename(filePath), created_at: stat.mtime.getTime(), imported_at: Date.now(), size: stat.size, hash }, fileMeta);
            yield this.handleFile(filePath, fileData, (options === null || options === void 0 ? void 0 : options.importType) || 'copy');
            return this.createFile(fileData);
        });
    }
    getFileFolders(fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.getSql('SELECT f.* FROM folders f JOIN files fi ON fi.folder_id = f.id WHERE fi.id = ?', [fileId]);
            return rows.map(row => this.rowToMap(row));
        });
    }
    getFileTags(fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.getSql('SELECT tags FROM files WHERE id = ?', [fileId]);
            if (rows.length === 0)
                return [];
            try {
                const tagsStr = rows[0].tags;
                if (!tagsStr)
                    return [];
                const tagIds = JSON.parse(tagsStr).filter((id) => id);
                if (tagIds.length === 0)
                    return [];
                const tagRows = yield this.getSql(`SELECT * FROM tags WHERE id IN (${tagIds.map(() => '?').join(',')})`, tagIds);
                return tagRows.map(row => this.rowToMap(row));
            }
            catch (err) {
                return [];
            }
        });
    }
    setFileFolders(fileId, folderId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!folderId)
                return false;
            yield this.beginTransaction();
            try {
                const result = yield this.runSql('UPDATE files SET folder_id = ? WHERE id = ?', [
                    folderId,
                    fileId,
                ]);
                yield this.commitTransaction();
                return result.changes > 0;
            }
            catch (err) {
                yield this.rollbackTransaction();
                throw err;
            }
        });
    }
    setFileTags(fileId, tagIds) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.beginTransaction();
            try {
                const result = yield this.runSql('UPDATE files SET tags = ? WHERE id = ?', [
                    JSON.stringify(tagIds),
                    fileId,
                ]);
                yield this.commitTransaction();
                return result.changes > 0;
            }
            catch (err) {
                yield this.rollbackTransaction();
                throw err;
            }
        });
    }
    getAllTags() {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.getSql('SELECT * FROM tags', []);
            return rows.map(row => this.rowToMap(row));
        });
    }
    getAllFolders() {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.getSql('SELECT * FROM folders', []);
            return rows.map(row => this.rowToMap(row));
        });
    }
    getLibraryId() {
        return this.config.id;
    }
    getItemPath(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const libraryPath = yield this.getLibraryPath();
            const folderName = yield this.getFolderName(item.folder_id);
            return path.join(libraryPath, folderName);
        });
    }
    getItemThumbPath(item, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const libraryPath = yield this.getLibraryPath();
            const fileName = item.hash ? `${item.hash}.png` : `${item.id}.png`;
            const thumbFile = path.join(libraryPath, 'thumbs', fileName);
            if (options === null || options === void 0 ? void 0 : options.checkExists) {
                return fs.existsSync(thumbFile) ? thumbFile : '';
            }
            return thumbFile;
        });
    }
    getEventManager() {
        return this.eventManager;
    }
    rowToMap(row) {
        const map = {};
        for (const key in row) {
            map[key] = row[key];
        }
        return map;
    }
    calculateFileHashSync(filePath) {
        const buffer = fs.readFileSync(filePath);
        // 这里应该使用实际的哈希算法实现
        return buffer.toString('hex').substring(0, 32); // 简化示例
    }
    handleFile(filePath, fileData, importType) {
        return __awaiter(this, void 0, void 0, function* () {
            const destPath = path.join(yield this.getItemPath(fileData), fileData.name);
            switch (importType) {
                case 'link':
                    // 保持原文件位置不变
                    break;
                case 'copy':
                    fs.copyFileSync(filePath, destPath);
                    fileData.path = destPath;
                    break;
                case 'move':
                    fs.renameSync(filePath, destPath);
                    fileData.path = destPath;
                    break;
                default:
                    throw new Error(`Unknown import type: ${importType}`);
            }
        });
    }
    getFolderName(folderId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (folderId) {
                const folder = yield this.getFolder(folderId);
                if (folder)
                    return folder.title;
            }
            return '未分类';
        });
    }
    executeSql(sql, params) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.run(sql, params, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    runSql(sql, params) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.run(sql, params, function (err) {
                if (err)
                    reject(err);
                else
                    resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }
    getSql(sql, params) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    getLibraryPath() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            return ((_a = this.config.customFields) === null || _a === void 0 ? void 0 : _a.path) || '';
        });
    }
    query(sql, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getSql(sql, params);
        });
    }
    getLibraryInfo() {
        return {
            id: this.getLibraryId(),
            status: 'connected',
            config: this.config
        };
    }
    // 查询方法
    queryFile(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { result } = yield this.getFiles({ filters: query });
            return result;
        });
    }
    queryFolder(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const folders = yield this.getFolders();
            return folders.filter(folder => {
                return Object.entries(query).every(([key, value]) => {
                    return folder[key] === value;
                });
            });
        });
    }
    queryLibrary(query) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getLibraryInfo();
        });
    }
    createLibrary(data) {
        return __awaiter(this, void 0, void 0, function* () {
            this.config.id = data.id || this.config.id;
            this.config.customFields = Object.assign(Object.assign({}, this.config.customFields), data);
            return this.getLibraryInfo();
        });
    }
    closeLibrary() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.close();
            return true;
        });
    }
    queryTag(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const tags = yield this.getTags();
            return tags.filter(tag => {
                return Object.entries(query).every(([key, value]) => {
                    return tag[key] === value;
                });
            });
        });
    }
}
exports.LibraryServerDataSQLite = LibraryServerDataSQLite;
