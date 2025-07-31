import * as path from 'path';
import * as fs from 'fs';
import { Stats } from 'fs';
import { LibraryServerDataSQLite } from '../lib/LibraryServerDataSQLite';

interface FileImportOptions {
  maxFolderDepth?: number;
  importType?: 'copy' | 'move';
}

export class PathFilesImporter {
  constructor(
    private libraryData: LibraryServerDataSQLite,
  ) {}

  async importFilesFromPath(
    sourcePath: string,
    options: FileImportOptions = {}
  ): Promise<void> {
    await this.libraryData.initialize();
    try {
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source path does not exist: ${sourcePath}`);
      }

      const stats = fs.statSync(sourcePath);
      if (stats.isFile()) {
        await this.importSingleFile(sourcePath, sourcePath, options);
      } else {
        await this.importDirectoryFiles(sourcePath, sourcePath, options);
      }
    } catch (error) {
      console.error('Error during file import:', error);
      throw error;
    }
  }

  private async importDirectoryFiles(
    sourcePath: string,
    dirPath: string,
    options: FileImportOptions
  ): Promise<void> {
    const files = fs.readdirSync(dirPath);
    let processed = 0;

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        await this.importDirectoryFiles(sourcePath, fullPath, options);
      } else if (stats.isFile()) {
        await this.importSingleFile(sourcePath, fullPath, options);
        processed++;
        process.stdout.write(`\rProcessed ${processed} files`);
      }
    }
  }

  private async importSingleFile(
    sourcePath: string,
    filePath: string,
    options: FileImportOptions
  ): Promise<void> {
    const extName = path.extname(filePath).toLocaleLowerCase();
    if (['.db'].includes(extName)) return;

    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    // 处理文件夹层级
    const folderPath = this.getLimitedFolderPath(sourcePath, filePath, options.maxFolderDepth);
    const folderId = await this.getOrCreateFolder(sourcePath, folderPath);

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
    await this.libraryData.createFile(fileData);

    // 处理文件移动/复制
    if (options.importType) {
      try {
        // 确保目标路径正确
        const targetDir = await this.libraryData.getItemPath(fileData);
        if (!targetDir) {
          throw new Error('Failed to get target directory path');
        }
        const savePath = path.join(targetDir, fileData.name);
        const saveDir = path.dirname(savePath);
        
        if (!fs.existsSync(saveDir)) {
          try {
            fs.mkdirSync(saveDir, { recursive: true });
          } catch (err) {}
        }
        console.log(filePath);
        if (options.importType === 'copy') {
          fs.copyFileSync(filePath, savePath);
        } else if (options.importType === 'move') {
          fs.renameSync(filePath, savePath);
        }
      } catch (err) {
        console.error(`Failed to ${options.importType} file: ${filePath}`, err);
      }
    }
  }

  private getLimitedFolderPath(
    sourcePath: string,
    filePath: string,
    maxDepth?: number
  ): string {
    if (maxDepth === undefined || maxDepth <= 0) {
      return path.dirname(filePath);
    }
    const parts = path.dirname(filePath).replace(sourcePath, '').split(path.sep).filter(p => p !== '.' && p !== '');
    return parts.slice(0, Math.min(maxDepth, parts.length)).join(path.sep);
  }

  private async getOrCreateFolder(sourcePath: string, folderPath: string): Promise<number | null> {
    if (!folderPath || folderPath === '.' || folderPath === path.sep) {
      return null;
    }

    // 规范化路径并分割
    const parts = folderPath.replace(sourcePath, '').split(path.sep).filter(p => p);
    let currentParentId: number | null = null;
    for (const part of parts) {
      // 检查文件夹是否已存在
      const existingFolder: Record<string, any> | null = await this.libraryData.findFolderByName(part, currentParentId);
      if (existingFolder) {
        currentParentId = existingFolder.id;
        continue;
      }

      // 创建新文件夹
      console.log({msg: 'create_folder', part, parts})
      const newFolderId = await this.libraryData.createFolder({
        title: part,
        parent_id: currentParentId
      });
      currentParentId = newFolderId;
    }

    return currentParentId;
  }
}

// 使用示例
async function main(sourcePath: string, options?: FileImportOptions & { targetDbPath?: string }) {
  if (!sourcePath) {
    console.error('Usage: ts-node pathFilesToLibrary.ts <sourcePath> <targetDbPath> [maxFolderDepth]');
    process.exit(1);
  }

  const config = {
    id: 'library-1',
    customFields: {
      path: options?.targetDbPath
    }
  };
  
  const libraryData = new LibraryServerDataSQLite({} as any, config);
  await libraryData.initialize();
  const importer = new PathFilesImporter(libraryData);
  
  try {
    console.log('Importing files...');
    await importer.importFilesFromPath(sourcePath, options);
    console.log('\nFile import completed successfully.');
  } catch (error) {
    console.error('File import failed:', error);
    process.exit(1);
  } finally {
    await libraryData.close();
  }
}

// 如果是直接执行此文件而不是被导入
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: FileImportOptions & { targetDbPath?: string } = {
    importType: 'move', // 默认为复制
    targetDbPath: args[1],
    maxFolderDepth: args[2] ? parseInt(args[2]) : undefined,
  };
  main(args[0], options).catch(console.error);
}