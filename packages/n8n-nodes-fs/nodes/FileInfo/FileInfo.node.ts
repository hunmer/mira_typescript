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
import { formatFileSize, detectMimeType, isBinaryContent, calculateMd5Checksum } from '../../utils/fileUtils';

export class FileInfo implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'File Info',
        name: 'fileInfo',
        icon: 'fa:info-circle',
        group: ['input'],
        version: 1,
        description: 'Get detailed information about a file or directory',
        defaults: {
            name: 'File Info',
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
                description: 'The path to the file or directory to get information about',
            },
            {
                displayName: 'Include Options',
                name: 'includeOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'MIME Type Detection',
                        name: 'detectMimeType',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to detect and include MIME type for files',
                    },
                    {
                        displayName: 'File Content Sample',
                        name: 'includeContentSample',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to include a small sample of file content (first 200 chars)',
                    },
                    {
                        displayName: 'Directory Contents Count',
                        name: 'countDirectoryContents',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to count files and subdirectories (for directories)',
                    },
                    {
                        displayName: 'Checksum (MD5)',
                        name: 'calculateChecksum',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to calculate MD5 checksum for files',
                    },
                    {
                        displayName: 'Real Path Resolution',
                        name: 'resolveRealPath',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to resolve symbolic links to real paths',
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
                const includeOptions = this.getNodeParameter('includeOptions', i, {}) as any;

                // Validate file path
                if (!filePath) {
                    throw new NodeOperationError(this.getNode(), 'File path is required', { itemIndex: i });
                }

                // Resolve absolute path
                const absolutePath = path.resolve(filePath);

                // Check if path exists
                if (!existsSync(absolutePath)) {
                    throw new NodeOperationError(this.getNode(), `Path not found: ${absolutePath}`, { itemIndex: i });
                }

                // Get basic file stats
                const stats = await fs.stat(absolutePath);
                const isFile = stats.isFile();
                const isDirectory = stats.isDirectory();
                const isSymbolicLink = stats.isSymbolicLink();

                // Basic file information
                const fileInfo: any = {
                    path: absolutePath,
                    name: path.basename(absolutePath),
                    directory: path.dirname(absolutePath),
                    extension: isFile ? path.extname(absolutePath) : '',
                    type: isDirectory ? 'directory' : isFile ? 'file' : 'other',
                    size: stats.size,
                    sizeHuman: formatFileSize(stats.size),
                    created: stats.birthtime,
                    modified: stats.mtime,
                    accessed: stats.atime,
                    isFile,
                    isDirectory,
                    isSymbolicLink,
                    permissions: {
                        mode: stats.mode,
                        octal: '0' + (stats.mode & parseInt('777', 8)).toString(8),
                        readable: !!(stats.mode & 0o444),
                        writable: !!(stats.mode & 0o222),
                        executable: !!(stats.mode & 0o111),
                    },
                    owner: {
                        uid: stats.uid,
                        gid: stats.gid,
                    },
                    blocks: stats.blocks,
                    blockSize: stats.blksize,
                    device: stats.dev,
                    inode: stats.ino,
                    hardLinks: stats.nlink,
                };

                // Optional: Resolve real path for symbolic links
                if (includeOptions.resolveRealPath && isSymbolicLink) {
                    try {
                        fileInfo.realPath = await fs.realpath(absolutePath);
                    } catch (error: any) {
                        fileInfo.realPathError = error.message;
                    }
                }

                // Optional: MIME type detection for files
                if (includeOptions.detectMimeType && isFile) {
                    fileInfo.mimeType = detectMimeType(absolutePath);
                }

                // Optional: Content sample for files
                if (includeOptions.includeContentSample && isFile && stats.size > 0) {
                    try {
                        const buffer = await fs.readFile(absolutePath);
                        const sampleSize = Math.min(200, buffer.length);
                        const sample = buffer.slice(0, sampleSize).toString('utf8');
                        fileInfo.contentSample = sample;
                        fileInfo.contentSampleSize = sampleSize;
                        fileInfo.isBinary = isBinaryContent(buffer.slice(0, 512));
                    } catch (error: any) {
                        fileInfo.contentSampleError = error.message;
                    }
                }

                // Optional: Directory contents count
                if (includeOptions.countDirectoryContents && isDirectory) {
                    try {
                        const contents = await fs.readdir(absolutePath);
                        const counts = { files: 0, directories: 0, others: 0, total: contents.length };

                        for (const item of contents) {
                            const itemPath = path.join(absolutePath, item);
                            const itemStats = await fs.stat(itemPath);
                            if (itemStats.isFile()) counts.files++;
                            else if (itemStats.isDirectory()) counts.directories++;
                            else counts.others++;
                        }

                        fileInfo.contents = counts;
                    } catch (error: any) {
                        fileInfo.contentsError = error.message;
                    }
                }

                // Optional: Calculate checksum for files
                if (includeOptions.calculateChecksum && isFile && stats.size > 0) {
                    try {
                        fileInfo.checksum = await calculateMd5Checksum(absolutePath);
                    } catch (error: any) {
                        fileInfo.checksumError = error.message;
                    }
                }

                returnData.push({
                    json: fileInfo,
                    pairedItem: { item: i },
                });

            } catch (error: any) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
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

    private detectMimeType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: { [key: string]: string } = {
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.xml': 'text/xml',
            '.csv': 'text/csv',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed',
            '.tar': 'application/x-tar',
            '.gz': 'application/gzip',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    private isBinaryContent(buffer: any): boolean {
        // Simple heuristic: if buffer contains null bytes or high ratio of non-printable chars, it's binary
        const nullBytes = buffer.indexOf(0);
        if (nullBytes !== -1) return true;

        let printableChars = 0;
        for (let i = 0; i < buffer.length; i++) {
            const byte = buffer[i];
            if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
                printableChars++;
            }
        }

        return (printableChars / buffer.length) < 0.7;
    }

    private async calculateMd5Checksum(filePath: string): Promise<string> {
        // Note: This is a simplified implementation
        // In a real implementation, you'd use crypto.createHash('md5')
        const buffer = await fs.readFile(filePath);
        // For now, return a placeholder - would need crypto module
        return `md5-${buffer.length}-${Date.now()}`;
    }
}
