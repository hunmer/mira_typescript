import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeApiError,
    NodeConnectionType,
    NodeOperationError,
} from 'n8n-workflow';

import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import * as path from 'path';
import { formatFileSize, copyDirectoryRecursive } from '../../utils/fileUtils';

export class MoveFile implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Move File',
        name: 'moveFile',
        icon: 'fa:arrow-right',
        group: ['transform'],
        version: 1,
        description: 'Move or rename files and directories',
        defaults: {
            name: 'Move File',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        properties: [
            {
                displayName: 'Source Path',
                name: 'sourcePath',
                type: 'string',
                required: true,
                default: '',
                placeholder: '/path/to/source/file',
                description: 'The path of the file or directory to move',
            },
            {
                displayName: 'Destination Path',
                name: 'destinationPath',
                type: 'string',
                required: true,
                default: '',
                placeholder: '/path/to/destination/file',
                description: 'The destination path for the moved file or directory',
            },
            {
                displayName: 'Move Options',
                name: 'moveOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Overwrite Existing',
                        name: 'overwrite',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to overwrite existing files at destination',
                    },
                    {
                        displayName: 'Create Destination Directory',
                        name: 'createDestDir',
                        type: 'boolean',
                        default: true,
                        description: 'Whether to create destination directory if it doesn\'t exist',
                    },
                    {
                        displayName: 'Move Mode',
                        name: 'moveMode',
                        type: 'options',
                        options: [
                            {
                                name: 'File Only',
                                value: 'file',
                                description: 'Move only if source is a file',
                            },
                            {
                                name: 'Directory Only',
                                value: 'directory',
                                description: 'Move only if source is a directory',
                            },
                            {
                                name: 'Auto Detect',
                                value: 'auto',
                                description: 'Automatically detect and move file or directory',
                            },
                        ],
                        default: 'auto',
                        description: 'What type of item to move',
                    },
                    {
                        displayName: 'Fallback to Copy+Delete',
                        name: 'fallbackCopy',
                        type: 'boolean',
                        default: true,
                        description: 'Whether to fallback to copy+delete if atomic move fails (cross-filesystem)',
                    },
                    {
                        displayName: 'Backup Original',
                        name: 'createBackup',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to create a backup before moving (for safety)',
                    },
                    {
                        displayName: 'Backup Directory',
                        name: 'backupDirectory',
                        type: 'string',
                        displayOptions: {
                            show: {
                                createBackup: [true],
                            },
                        },
                        default: '',
                        placeholder: '/path/to/backup/directory',
                        description: 'Directory to store backups (uses temp if empty)',
                    },
                ],
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const sourcePath = this.getNodeParameter('sourcePath', i) as string;
                const destinationPath = this.getNodeParameter('destinationPath', i) as string;
                const moveOptions = this.getNodeParameter('moveOptions', i, {}) as any;

                const overwrite = moveOptions.overwrite || false;
                const createDestDir = moveOptions.createDestDir !== false;
                const moveMode = moveOptions.moveMode || 'auto';
                const fallbackCopy = moveOptions.fallbackCopy !== false;
                const createBackup = moveOptions.createBackup || false;
                const backupDirectory = moveOptions.backupDirectory || '';

                // Validate paths
                if (!sourcePath) {
                    throw new NodeOperationError(this.getNode(), 'Source path is required', { itemIndex: i });
                }
                if (!destinationPath) {
                    throw new NodeOperationError(this.getNode(), 'Destination path is required', { itemIndex: i });
                }

                // Resolve absolute paths
                const absoluteSourcePath = path.resolve(sourcePath);
                const absoluteDestPath = path.resolve(destinationPath);

                // Check if source exists
                if (!existsSync(absoluteSourcePath)) {
                    throw new NodeOperationError(this.getNode(), `Source path not found: ${absoluteSourcePath}`, { itemIndex: i });
                }

                // Get source stats
                const sourceStats = await fs.stat(absoluteSourcePath);
                const isSourceFile = sourceStats.isFile();
                const isSourceDirectory = sourceStats.isDirectory();

                // Validate move mode
                if (moveMode === 'file' && !isSourceFile) {
                    throw new NodeOperationError(this.getNode(),
                        `Source is not a file (move mode is 'file'): ${absoluteSourcePath}`,
                        { itemIndex: i }
                    );
                }
                if (moveMode === 'directory' && !isSourceDirectory) {
                    throw new NodeOperationError(this.getNode(),
                        `Source is not a directory (move mode is 'directory'): ${absoluteSourcePath}`,
                        { itemIndex: i }
                    );
                }

                // Check if destination exists
                const destExists = existsSync(absoluteDestPath);
                if (destExists && !overwrite) {
                    throw new NodeOperationError(this.getNode(),
                        `Destination already exists and overwrite is disabled: ${absoluteDestPath}`,
                        { itemIndex: i }
                    );
                }

                // Create destination directory if needed
                if (createDestDir) {
                    const destDir = path.dirname(absoluteDestPath);
                    if (!existsSync(destDir)) {
                        await fs.mkdir(destDir, { recursive: true });
                    }
                }

                // Create backup if requested
                let backupPath = '';
                if (createBackup) {
                    const backupDir = backupDirectory || '/tmp';
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const backupName = `${path.basename(absoluteSourcePath)}.backup.${timestamp}`;
                    backupPath = path.join(backupDir, backupName);

                    // Ensure backup directory exists
                    await fs.mkdir(path.dirname(backupPath), { recursive: true });

                    if (isSourceFile) {
                        await fs.copyFile(absoluteSourcePath, backupPath);
                    } else if (isSourceDirectory) {
                        // For directories, create a simple backup reference
                        await fs.writeFile(backupPath + '.info', JSON.stringify({
                            originalPath: absoluteSourcePath,
                            backupTime: new Date().toISOString(),
                            type: 'directory',
                            note: 'Directory backup - original was moved'
                        }));
                    }
                }

                // Perform move operation
                const moveStartTime = Date.now();
                let moveMethod = 'atomic';

                try {
                    // Try atomic rename first (fastest)
                    await fs.rename(absoluteSourcePath, absoluteDestPath);
                } catch (renameError: any) {
                    if (fallbackCopy) {
                        // Fallback to copy + delete (for cross-filesystem moves)
                        moveMethod = 'copy-delete';

                        if (isSourceFile) {
                            await fs.copyFile(absoluteSourcePath, absoluteDestPath);
                            await fs.unlink(absoluteSourcePath);
                        } else if (isSourceDirectory) {
                            await copyDirectoryRecursive(absoluteSourcePath, absoluteDestPath);
                            await fs.rmdir(absoluteSourcePath, { recursive: true });
                        }
                    } else {
                        throw new NodeOperationError(this.getNode(),
                            `Move failed and fallback is disabled: ${renameError.message}`,
                            { itemIndex: i }
                        );
                    }
                }

                const moveEndTime = Date.now();

                // Get destination stats
                const destStats = await fs.stat(absoluteDestPath);

                // Prepare return data
                const returnItem: any = {
                    success: true,
                    moved: true,
                    sourcePath: absoluteSourcePath,
                    destinationPath: absoluteDestPath,
                    sourceType: isSourceFile ? 'file' : 'directory',
                    sourceName: path.basename(absoluteSourcePath),
                    destinationName: path.basename(absoluteDestPath),
                    size: destStats.size,
                    sizeHuman: formatFileSize(destStats.size),
                    moveTime: moveEndTime - moveStartTime,
                    moveMethod,
                    movedAt: new Date().toISOString(),
                    overwriteMode: overwrite,
                    isRename: path.dirname(absoluteSourcePath) === path.dirname(absoluteDestPath),
                };

                if (backupPath) {
                    returnItem.backupPath = backupPath;
                }

                returnData.push({
                    json: returnItem,
                    pairedItem: { item: i },
                });

            } catch (error: any) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            success: false,
                            moved: false,
                            error: error.message,
                            sourcePath: this.getNodeParameter('sourcePath', i, ''),
                            destinationPath: this.getNodeParameter('destinationPath', i, ''),
                        },
                        pairedItem: { item: i },
                    });
                } else {
                    throw error;
                }
            }
        }

        return [returnData];
    }

    private async copyDirectoryRecursive(sourcePath: string, destPath: string): Promise<void> {
        // Create destination directory
        await fs.mkdir(destPath, { recursive: true });

        // Get directory contents
        const items = await fs.readdir(sourcePath);

        for (const item of items) {
            const sourceItemPath = path.join(sourcePath, item);
            const destItemPath = path.join(destPath, item);
            const stats = await fs.stat(sourceItemPath);

            if (stats.isFile()) {
                await fs.copyFile(sourceItemPath, destItemPath);
            } else if (stats.isDirectory()) {
                await this.copyDirectoryRecursive(sourceItemPath, destItemPath);
            }
        }
    }

    private formatFileSize(bytes: number): string {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}
