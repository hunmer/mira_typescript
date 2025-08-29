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
import { formatFileSize } from '../../utils/fileUtils';

export class DeleteFile implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Delete File',
        name: 'deleteFile',
        icon: 'fa:trash',
        group: ['output'],
        version: 1,
        description: 'Delete files or directories',
        defaults: {
            name: 'Delete File',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        properties: [
            {
                displayName: 'Path',
                name: 'filePath',
                type: 'string',
                required: true,
                default: '',
                placeholder: '/path/to/file/or/directory',
                description: 'The path to the file or directory to delete',
            },
            {
                displayName: 'Delete Mode',
                name: 'deleteMode',
                type: 'options',
                options: [
                    {
                        name: 'File Only',
                        value: 'file',
                        description: 'Delete only if it\'s a file (fail if directory)',
                    },
                    {
                        name: 'Directory Only',
                        value: 'directory',
                        description: 'Delete only if it\'s a directory (fail if file)',
                    },
                    {
                        name: 'Auto Detect',
                        value: 'auto',
                        description: 'Automatically detect and delete file or directory',
                    },
                ],
                default: 'auto',
                description: 'What type of item to delete',
            },
            {
                displayName: 'Safety Options',
                name: 'safetyOptions',
                type: 'collection',
                placeholder: 'Add Safety Option',
                default: {},
                options: [
                    {
                        displayName: 'Recursive Directory Deletion',
                        name: 'recursive',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to delete directories recursively with all contents',
                    },
                    {
                        displayName: 'Require Confirmation',
                        name: 'requireConfirmation',
                        type: 'boolean',
                        default: true,
                        description: 'Whether to require explicit confirmation for deletion',
                    },
                    {
                        displayName: 'Confirmation Text',
                        name: 'confirmationText',
                        type: 'string',
                        displayOptions: {
                            show: {
                                requireConfirmation: [true],
                            },
                        },
                        default: 'DELETE',
                        description: 'Text that must be provided to confirm deletion',
                    },
                    {
                        displayName: 'Max File Size (MB)',
                        name: 'maxFileSize',
                        type: 'number',
                        default: 0,
                        description: 'Maximum file size to delete in MB (0 = no limit)',
                    },
                    {
                        displayName: 'Backup Before Delete',
                        name: 'createBackup',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to create a backup before deletion',
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
                    {
                        displayName: 'Skip if Not Exists',
                        name: 'skipIfNotExists',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to skip without error if file doesn\'t exist',
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
                const filePath = this.getNodeParameter('filePath', i) as string;
                const deleteMode = this.getNodeParameter('deleteMode', i) as string;
                const safetyOptions = this.getNodeParameter('safetyOptions', i, {}) as any;

                // Validate file path
                if (!filePath) {
                    throw new NodeOperationError(this.getNode(), 'File path is required', { itemIndex: i });
                }

                // Resolve absolute path
                const absolutePath = path.resolve(filePath);

                // Check if path exists
                if (!existsSync(absolutePath)) {
                    if (safetyOptions.skipIfNotExists) {
                        returnData.push({
                            json: {
                                success: true,
                                skipped: true,
                                message: 'File does not exist, skipped as requested',
                                path: absolutePath,
                            },
                            pairedItem: { item: i },
                        });
                        continue;
                    } else {
                        throw new NodeOperationError(this.getNode(), `Path not found: ${absolutePath}`, { itemIndex: i });
                    }
                }

                // Get file stats
                const stats = await fs.stat(absolutePath);
                const isFile = stats.isFile();
                const isDirectory = stats.isDirectory();

                // Validate delete mode
                if (deleteMode === 'file' && !isFile) {
                    throw new NodeOperationError(this.getNode(),
                        `Path is not a file (delete mode is 'file'): ${absolutePath}`,
                        { itemIndex: i }
                    );
                }
                if (deleteMode === 'directory' && !isDirectory) {
                    throw new NodeOperationError(this.getNode(),
                        `Path is not a directory (delete mode is 'directory'): ${absolutePath}`,
                        { itemIndex: i }
                    );
                }

                // Check file size limit
                if (safetyOptions.maxFileSize && isFile) {
                    const maxSizeBytes = safetyOptions.maxFileSize * 1024 * 1024;
                    if (stats.size > maxSizeBytes) {
                        throw new NodeOperationError(this.getNode(),
                            `File size (${Math.round(stats.size / 1024 / 1024)}MB) exceeds limit (${safetyOptions.maxFileSize}MB)`,
                            { itemIndex: i }
                        );
                    }
                }

                // Check confirmation requirement
                if (safetyOptions.requireConfirmation) {
                    const confirmationText = safetyOptions.confirmationText || 'DELETE';
                    const providedConfirmation = this.getNodeParameter('confirmationProvided', i, '') as string;

                    if (providedConfirmation !== confirmationText) {
                        throw new NodeOperationError(this.getNode(),
                            `Deletion requires confirmation. Please provide: "${confirmationText}"`,
                            { itemIndex: i }
                        );
                    }
                }

                // Create backup if requested
                let backupPath = '';
                if (safetyOptions.createBackup) {
                    const backupDir = safetyOptions.backupDirectory || '/tmp';
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const backupName = `${path.basename(absolutePath)}.backup.${timestamp}`;
                    backupPath = path.join(backupDir, backupName);

                    // Ensure backup directory exists
                    await fs.mkdir(path.dirname(backupPath), { recursive: true });

                    if (isFile) {
                        await fs.copyFile(absolutePath, backupPath);
                    } else if (isDirectory) {
                        // For directories, create a tar-like backup (simplified)
                        // In real implementation, you'd use tar or similar
                        throw new NodeOperationError(this.getNode(),
                            'Directory backup not implemented in this simplified version',
                            { itemIndex: i }
                        );
                    }
                }

                // Perform deletion
                const deletionStartTime = Date.now();

                if (isFile) {
                    await fs.unlink(absolutePath);
                } else if (isDirectory) {
                    if (safetyOptions.recursive) {
                        await fs.rmdir(absolutePath, { recursive: true });
                    } else {
                        // Try to delete empty directory
                        await fs.rmdir(absolutePath);
                    }
                }

                const deletionEndTime = Date.now();

                // Prepare return data
                const returnItem: any = {
                    success: true,
                    deleted: true,
                    path: absolutePath,
                    name: path.basename(absolutePath),
                    type: isFile ? 'file' : 'directory',
                    size: stats.size,
                    sizeHuman: formatFileSize(stats.size),
                    deletionTime: deletionEndTime - deletionStartTime,
                    deletedAt: new Date().toISOString(),
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
                            error: error.message,
                            path: this.getNodeParameter('filePath', i, ''),
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

    private formatFileSize(bytes: number): string {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}
