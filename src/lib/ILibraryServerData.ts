export interface ILibraryServerData {
  initialize(): Promise<void>;
  createFile(fileData: Record<string, any>): Promise<Record<string, any>>;
  updateFile(id: number, fileData: Record<string, any>): Promise<boolean>;
  deleteFile(id: number, options?: { moveToRecycleBin: boolean }): Promise<boolean>;
  recoverFile(id: number): Promise<boolean>;
  getFile(id: number): Promise<Record<string, any> | null>;
  getFiles(options?: {
    select?: string;
    filters?: Record<string, any>;
  }): Promise<{
    result: Record<string, any>[];
    limit: number;
    offset: number;
    total: number;
  }>;
  
  // 文件夹相关方法
  createFolder(folderData: Record<string, any>): Promise<number>;
  updateFolder(id: number, folderData: Record<string, any>): Promise<boolean>;
  deleteFolder(id: number): Promise<boolean>;
  getFolder(id: number): Promise<Record<string, any> | null>;
  getFolders(options?: {
    parentId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Record<string, any>[]>;
  
  // 标签相关方法
  createTag(tagData: Record<string, any>): Promise<number>;
  updateTag(id: number, tagData: Record<string, any>): Promise<boolean>;
  deleteTag(id: number): Promise<boolean>;
  getTag(id: number): Promise<Record<string, any> | null>;
  getTags(options?: {
    parentId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Record<string, any>[]>;
  
  // 事务管理
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  
  // 其他方法
  close(): Promise<void>;
  createFileFromPath(
    filePath: string,
    fileMeta: Record<string, any>,
    options?: { importType: string }
  ): Promise<Record<string, any>>;
  getFileFolders(fileId: number): Promise<Record<string, any>[]>;
  getFileTags(fileId: number): Promise<Record<string, any>[]>;
  setFileFolders(fileId: number, folderId: string): Promise<boolean>;
  setFileTags(fileId: number, tagIds: string[]): Promise<boolean>;
  getAllTags(): Promise<Record<string, any>[]>;
  getAllFolders(): Promise<Record<string, any>[]>;
  getLibraryId(): string;
  getItemPath(item: Record<string, any>): Promise<string>;
  getItemThumbPath(
    item: Record<string, any>,
    options?: { checkExists: boolean }
  ): Promise<string>;
  getEventManager(): any; // 需要根据实际类型定义
}
