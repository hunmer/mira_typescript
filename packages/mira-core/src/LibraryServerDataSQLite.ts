import { Database } from 'sqlite3';
import { ILibraryServerData } from './ILibraryServerData';
import * as path from 'path';
import * as fs from 'fs';
import { EventManager } from './event-manager';
import { ServerPluginManager } from './ServerPluginManager';
import { MiraWebsocketServer } from './WebSocketServer';
import { MiraHttpServer } from './HttpServer';

export class LibraryServerDataSQLite implements ILibraryServerData {
  private db: Database | null = null;
  private inTransaction = false;
  private enableHash: boolean;
  private readonly websocketServer: MiraWebsocketServer | undefined;
  eventManager: EventManager | undefined;
  readonly config: Record<string, any>;
  pluginManager: ServerPluginManager | undefined;
  httpServer: MiraHttpServer | undefined;

  private async initializePlugins(): Promise<void> {
    if (this.pluginManager) await this.pluginManager.loadPlugins();
  }

  constructor(config: Record<string, any>, opts: any) {
    this.config = config;
    if (opts.websocketServer || opts.httpServer) {
      this.websocketServer = opts.websocketServer;
      this.httpServer = opts.httpServer;
      this.eventManager = new EventManager();
      this.pluginManager = new ServerPluginManager(
        { server: opts.webSocketServer, dbService: this as unknown as ILibraryServerData, httpServer: opts.httpServer, pluginsDir: config.pluginsDir }
      );
    }
    this.initializePlugins();
    this.enableHash = config.customFields?.enableHash ?? false;
  }


  async initialize(): Promise<void> {
    // 初始化数据库连接和表结构
    const dbPath = path.join(await this.getLibraryPath(), 'library_data.db');
    this.db = new Database(dbPath);
    // 创建文件表
    await this.executeSql(`
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
    await this.executeSql(`
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
    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS tags(
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        parent_id INTEGER,
        color INTEGER,
        icon INTEGER,
        FOREIGN KEY(parent_id) REFERENCES tags(id)
      )
    `);
  }

  // 文件操作方法实现
  async createFile(fileData: Record<string, any>): Promise<Record<string, any>> {
    const result = await this.runSql(
      `INSERT INTO files(
        name, created_at, imported_at, size, hash, 
        custom_fields, notes, stars, folder_id,
        reference, path, thumb, recycled, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fileData.name,
        fileData.created_at,
        fileData.imported_at,
        fileData.size,
        fileData.hash,
        fileData.custom_fields,
        fileData.notes,
        fileData.stars ?? 0,
        fileData.folder_id,
        fileData.reference,
        fileData.path,
        fileData.thumb ?? 0,
        fileData.recycled ?? 0,
        fileData.tags,
      ]
    );
    return { id: result.lastID, ...fileData };
  }


  async updateFile(id: number, fileData: Record<string, any>): Promise<boolean> {
    const fields: string[] = [];
    const params: any[] = [];

    const addField = (key: string, value: any) => {
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
    addField('stars', fileData.stars ?? 0);
    addField('tags', fileData.tags);
    addField('folder_id', fileData.folder_id);
    addField('reference', fileData.reference);
    addField('path', fileData.path);
    addField('thumb', fileData.thumb ?? 0);
    addField('recycled', fileData.recycled ?? 0);

    if (fields.length === 0) return false;

    const query = `UPDATE files SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    const result = await this.runSql(query, params);
    return result.changes > 0;
  }

  async deleteFile(id: number, options?: { moveToRecycleBin: boolean }): Promise<boolean> {
    const query = options?.moveToRecycleBin
      ? 'UPDATE files SET recycled = 1 WHERE id = ?'
      : 'DELETE FROM files WHERE id = ?';
    const result = await this.runSql(query, [id]);
    return result.changes > 0;
  }

  async recoverFile(id: number): Promise<boolean> {
    const result = await this.runSql('UPDATE files SET recycled = 0 WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async getFile(id: number): Promise<Record<string, any> | null> {
    const rows = await this.getSql('SELECT * FROM files WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.rowToMap(rows[0]) : null;
  }

  async getFiles(options?: {
    select?: string;
    filters?: Record<string, any>;
    isUrlFile?: boolean;
  }): Promise<{
    result: Record<string, any>[];
    limit: number;
    offset: number;
    total: number;
  }> {
    const select = options?.select || '*';
    const filters = options?.filters || {};
    const whereClauses: string[] = [];
    const params: any[] = [];
    const folderId = parseInt(filters.folder?.toString() || '0') || 0;
    const tagIds = Array.isArray(filters.tags) ? filters.tags : [];
    const limit = parseInt(filters.limit?.toString() || '100') || 100;
    const offset = parseInt(filters.offset?.toString() || '0') || 0;

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

    if (filters.custom_fields) {
      const customFields = filters.custom_fields;
      const convertValue = (value: any) => {
        if (value == 'null') {
          value = null;
        }
        return value;
      }
      for (const [key, value] of Object.entries(customFields)) {
        if (typeof value === 'string' && value.startsWith('!=')) {
          let actualValue: string | null = value.substring(2).trim();
          whereClauses.push(`(json_extract(custom_fields, '$.${key}') IS NOT NULL OR json_extract(custom_fields, '$.${key}') != ?)`);
          params.push(convertValue(actualValue));
        } else if (typeof value === 'string' && value.startsWith('>')) {
          whereClauses.push(`json_extract(custom_fields, '$.${key}') > ?`);
          params.push(convertValue(value.substring(1).trim()));
        } else if (typeof value === 'string' && value.startsWith('<')) {
          whereClauses.push(`json_extract(custom_fields, '$.${key}') < ?`);
          params.push(convertValue(value.substring(1).trim()));
        } else {
          whereClauses.push(`json_extract(custom_fields, '$.${key}') = ?`);
          params.push(convertValue(value));
        }
      }
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    // 处理排序
    let orderBy = '';
    // sort?: 'imported_at' | 'id' | 'size' | 'stars' | 'folder_id' | 'tags' | 'name' | 'custom_fields';
    // order?: 'asc' | 'desc';
    if (filters?.sort) {
      const order = filters?.order || 'asc';
      if (filters.sort === 'custom_fields') {
        // 自定义字段排序需要特殊处理
        orderBy = ` ORDER BY json_extract(custom_fields, '$') ${order}`;
      } else {
        orderBy = ` ORDER BY ${filters.sort} ${order}`;
      }
    }

    const query = `SELECT ${select} FROM files ${where}${orderBy} LIMIT ? OFFSET ?`;
    const countQuery = `SELECT COUNT(*) as total FROM files ${where}`;

    const [rows, countRows] = await Promise.all([
      this.getSql(query, [...params, limit, offset]),
      this.getSql(countQuery, params),
    ]);

    return {
      result: await this.processingFiles(rows.map(row => this.rowToMap(row)), options?.isUrlFile),
      limit,
      offset,
      total: countRows[0].total,
    };
  }

  // 文件夹操作方法
  async createFolder(folderData: Record<string, any>): Promise<number> {
    const result = await this.runSql(
      'INSERT INTO folders(id, title, parent_id, color, icon) VALUES (?, ?, ?, ?, ?)',
      [
        folderData.id,
        folderData.title,
        folderData.parent_id,
        folderData.color,
        folderData.icon,
      ]
    );
    return result.lastID;
  }

  async updateFolder(id: number, folderData: Record<string, any>): Promise<boolean> {
    const result = await this.runSql(
      'UPDATE folders SET title = ?, parent_id = ?, color = ?, icon = ? WHERE id = ?',
      [
        folderData.title,
        folderData.parent_id,
        folderData.color,
        folderData.icon,
        id,
      ]
    );
    return result.changes > 0;
  }

  async deleteFolder(id: number): Promise<boolean> {
    await this.beginTransaction();
    try {
      // 递归删除子文件夹
      const children = await this.getFolders({ parentId: id });
      for (const child of children) {
        await this.deleteFolder(child.id);
      }

      // 更新文件的folder_id为null
      await this.runSql('UPDATE files SET folder_id = NULL WHERE folder_id = ?', [id]);

      // 删除文件夹
      const result = await this.runSql('DELETE FROM folders WHERE id = ?', [id]);
      await this.commitTransaction();
      return result.changes > 0;
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  }

  async getFolder(id: number): Promise<Record<string, any> | null> {
    const rows = await this.getSql('SELECT * FROM folders WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.rowToMap(rows[0]) : null;
  }

  async findFolderByName(name: string, parentId?: number | null): Promise<Record<string, any> | null> {
    const query = parentId !== undefined && parentId !== null
      ? 'SELECT * FROM folders WHERE title = ? AND parent_id = ? LIMIT 1'
      : 'SELECT * FROM folders WHERE title = ? AND parent_id IS NULL LIMIT 1';

    const params = parentId !== undefined && parentId !== null
      ? [name, parentId]
      : [name];

    const rows = await this.getSql(query, params);
    return rows.length > 0 ? this.rowToMap(rows[0]) : null;
  }

  async getFolders(options?: {
    parentId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Record<string, any>[]> {
    const parentId = options?.parentId;
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const where = parentId !== undefined ? 'WHERE parent_id = ?' : 'WHERE parent_id IS NULL';
    const params = parentId !== undefined ? [parentId, limit, offset] : [limit, offset];
    const query = `SELECT * FROM folders ${where} LIMIT ? OFFSET ?`;

    const rows = await this.getSql(query, params);
    return rows.map(row => this.rowToMap(row));
  }

  // 标签操作方法
  async createTag(tagData: Record<string, any>): Promise<number> {
    const result = await this.runSql(
      'INSERT INTO tags(id, title, parent_id, color, icon) VALUES (?, ?, ?, ?, ?)',
      [
        tagData.id,
        tagData.title,
        tagData.parent_id,
        tagData.color,
        tagData.icon,
      ]
    );
    return result.lastID;
  }

  async updateTag(id: number, tagData: Record<string, any>): Promise<boolean> {
    const result = await this.runSql(
      'UPDATE tags SET title = ?, parent_id = ?, color = ?, icon = ? WHERE id = ?',
      [
        tagData.title,
        tagData.parent_id,
        tagData.color,
        tagData.icon,
        id,
      ]
    );
    return result.changes > 0;
  }

  async deleteTag(id: number): Promise<boolean> {
    await this.beginTransaction();
    try {
      // 递归删除子标签
      const children = await this.getTags({ parentId: id });
      for (const child of children) {
        await this.deleteTag(child.id);
      }

      // 删除标签
      const result = await this.runSql('DELETE FROM tags WHERE id = ?', [id]);
      await this.commitTransaction();
      return result.changes > 0;
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  }

  async getTag(id: number): Promise<Record<string, any> | null> {
    const rows = await this.getSql('SELECT * FROM tags WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.rowToMap(rows[0]) : null;
  }

  async getTags(options?: {
    parentId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Record<string, any>[]> {
    const parentId = options?.parentId;
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const where = parentId !== undefined ? 'WHERE parent_id = ?' : 'WHERE parent_id IS NULL';
    const params = parentId !== undefined ? [parentId, limit, offset] : [limit, offset];
    const query = `SELECT * FROM tags ${where} LIMIT ? OFFSET ?`;

    const rows = await this.getSql(query, params);
    return rows.map(row => this.rowToMap(row));
  }

  // 事务管理
  async beginTransaction(): Promise<void> {
    if (!this.inTransaction) {
      await this.executeSql('BEGIN TRANSACTION');
      this.inTransaction = true;
    }
  }

  async commitTransaction(): Promise<void> {
    if (this.inTransaction) {
      await this.executeSql('COMMIT');
      this.inTransaction = false;
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (this.inTransaction) {
      await this.executeSql('ROLLBACK');
      this.inTransaction = false;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async createFileFromPath(
    filePath: string,
    fileMeta: Record<string, any>,
    options?: { importType: string }
  ): Promise<Record<string, any>> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    const hash = this.enableHash ? this.calculateFileHashSync(filePath) : '';

    const fileData = {
      path: filePath,
      name: path.basename(filePath),
      created_at: stat.mtime.getTime(),
      imported_at: Date.now(),
      size: stat.size,
      hash,
      ...fileMeta,
    };

    await this.handleFile(filePath, fileData, options?.importType || 'copy');
    return this.createFile(fileData);
  }

  async getFileFolder(fileId: number): Promise<Record<string, any>[]> {
    const rows = await this.getSql(
      'SELECT f.* FROM folders f JOIN files fi ON fi.folder_id = f.id WHERE fi.id = ?',
      [fileId]
    );
    return rows.map(row => this.rowToMap(row));
  }

  async getFileTags(fileId: number): Promise<Record<string, any>[]> {
    const rows = await this.getSql('SELECT tags FROM files WHERE id = ?', [fileId]);
    if (rows.length === 0) return [];

    try {
      const tagsStr = rows[0].tags;
      if (!tagsStr) return [];

      const tagIds = JSON.parse(tagsStr).filter((id: any) => id);
      if (tagIds.length === 0) return [];

      const tagRows = await this.getSql(
        `SELECT * FROM tags WHERE id IN (${tagIds.map(() => '?').join(',')})`,
        tagIds
      );
      return tagRows.map(row => this.rowToMap(row));
    } catch (err) {
      return [];
    }
  }

  async setFileFolder(fileId: number, folderId: string): Promise<boolean> {
    if (!folderId) return false;

    await this.beginTransaction();
    try {
      const result = await this.runSql('UPDATE files SET folder_id = ? WHERE id = ?', [
        folderId,
        fileId,
      ]);
      await this.commitTransaction();
      return result.changes > 0;
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  }

  async setFileTags(fileId: number, tagIds: string[]): Promise<boolean> {
    await this.beginTransaction();
    try {
      const result = await this.runSql('UPDATE files SET tags = ? WHERE id = ?', [
        JSON.stringify(tagIds),
        fileId,
      ]);
      await this.commitTransaction();
      return result.changes > 0;
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  }

  async getAllTags(): Promise<Record<string, any>[]> {
    const rows = await this.getSql('SELECT * FROM tags', []);
    return rows.map(row => this.rowToMap(row));
  }

  async getAllFolders(): Promise<Record<string, any>[]> {
    const rows = await this.getSql('SELECT * FROM folders', []);
    return rows.map(row => this.rowToMap(row));
  }

  getLibraryId(): string {
    return this.config.id;
  }

  async getItemPath(item: Record<string, any>): Promise<string> {
    const libraryPath = await this.getLibraryPath();
    const folderName = await this.getFolderName(item.folder_id);
    return path.join(libraryPath, folderName);
  }

  async getItemFilePath(item: Record<string, any>, options?: { isUrlFile: boolean }): Promise<string> {
    const libraryPath = await this.getLibraryPath();
    const folderName = await this.getFolderName(item.folder_id);
    const filePath = path.join(libraryPath, folderName, item.name);
    return options?.isUrlFile && this.httpServer ? this.httpServer.getPublicURL(`api/file/${this.getLibraryId()}/${item.id}`) : filePath
  }

  async getItemThumbPath(
    item: Record<string, any>,
    options?: { isUrlFile: boolean }
  ): Promise<string> {
    const libraryPath = await this.getLibraryPath();
    const fileName = item.hash ? `${item.hash}.png` : `${item.id}.png`;
    const thumbFile = path.join(libraryPath, 'thumbs', fileName);
    return options?.isUrlFile && this.httpServer ? this.httpServer.getPublicURL(`api/thumb/${this.getLibraryId()}/${item.id}`) : thumbFile
  }

  getEventManager(): EventManager | undefined {
    return this.eventManager;
  }

  private rowToMap(row: any): Record<string, any> {
    const map: Record<string, any> = {};
    for (const key in row) {
      map[key] = row[key];
    }
    return map;
  }

  private calculateFileHashSync(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    // 这里应该使用实际的哈希算法实现
    return buffer.toString('hex').substring(0, 32); // 简化示例
  }

  private async handleFile(
    filePath: string,
    fileData: Record<string, any>,
    importType: string
  ): Promise<void> {
    const destPath = path.join(await this.getItemPath(fileData), fileData.name);
    switch (importType) {
      case 'link':
        // 保持原文件位置不变
        break;
      case 'copy':
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(filePath, destPath);
        fileData.path = destPath;
        break;
      case 'move':
        const destDir2 = path.dirname(destPath);
        if (!fs.existsSync(destDir2)) {
          fs.mkdirSync(destDir2, { recursive: true });
        }
        // 如果不同是跨盘符操作，则单独复制一份，再删除源文件
        if (path.parse(filePath).root !== path.parse(destPath).root) {
          fs.copyFileSync(filePath, destPath);
          fs.unlinkSync(filePath);
        } else {
          fs.renameSync(filePath, destPath);
        }
        fileData.path = destPath;
        break;
      default:
        throw new Error(`Unknown import type: ${importType}`);
    }
  }

  private async getFolderName(folderId?: number): Promise<string> {
    if (folderId) {
      const folder = await this.getFolder(folderId);
      if (folder) return folder.title;
    }
    return '未分类';
  }

  private executeSql(sql: string, params?: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private runSql(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  private getSql(sql: string, params?: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getLibraryPath(): Promise<string> {
    return this.config.customFields?.path || '';
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    return this.getSql(sql, params);
  }

  async getLibraryInfo(): Promise<Record<string, any>> {
    const tags = await this.getAllTags();
    const folders = await this.getAllFolders();
    return {
      libraryId: this.getLibraryId(),
      status: 'connected',
      tags, folders,
    };
  }

  // 查询方法
  async queryFile(query: Record<string, any>, isUrlFile: boolean = true): Promise<Record<string, any>[]> {
    const { result } = await this.getFiles({ filters: query });
    return this.processingFiles(result, isUrlFile);
  }

  async processingFiles(files: Record<string, any>[], isUrlFile: boolean = true) {
    return Promise.all(files.map(async (file) => {
      return {
        ...file, ...{
          thumb: await this.getItemThumbPath(file, { isUrlFile }),
          path: await this.getItemFilePath(file, { isUrlFile }),
        }
      };
    }))
  }

  async queryFolder(query: Record<string, any>): Promise<Record<string, any>[]> {
    const folders = await this.getFolders();
    return folders.filter(folder => {
      return Object.entries(query).every(([key, value]) => {
        return folder[key] === value;
      });
    });
  }

  async queryLibrary(query: Record<string, any>): Promise<Record<string, any>> {
    return this.getLibraryInfo();
  }

  async createLibrary(data: Record<string, any>): Promise<Record<string, any>> {
    this.config.id = data.id || this.config.id;
    this.config.customFields = { ...this.config.customFields, ...data };
    return this.getLibraryInfo();
  }

  async closeLibrary(): Promise<boolean> {
    await this.close();
    return true;
  }

  async queryTag(query: Record<string, any>): Promise<Record<string, any>[]> {
    const tags = await this.getTags();
    return tags.filter(tag => {
      return Object.entries(query).every(([key, value]) => {
        return tag[key] === value;
      });
    });
  }
}