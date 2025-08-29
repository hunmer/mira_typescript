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
import { stat } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';

// Helper function to format file size
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export class ReadFile implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Read File',
        name: 'readFile',
        icon: 'fa:file',
        group: ['input'],
        version: 1,
        description: 'Read content from a file',
        defaults: {
            name: 'Read File',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        properties: [
            {
                displayName: 'File Path',
                name: 'filePath',
                type: 'string',
                required: true,
                default: '',
                placeholder: '/path/to/your/file.txt',
                description: 'The path to the file to read',
            },
            {
                displayName: 'Read Mode',
                name: 'readMode',
                type: 'options',
                options: [
                    {
                        name: 'Text',
                        value: 'text',
                        description: 'Read file as text content',
                    },
                    {
                        name: 'Binary',
                        value: 'binary',
                        description: 'Read file as binary data (base64 encoded)',
                    },
                    {
                        name: 'JSON',
                        value: 'json',
                        description: 'Read and parse file as JSON',
                    },
                ],
                default: 'text',
                description: 'How to read the file content',
            },
            {
                displayName: 'Encoding',
                name: 'encoding',
                type: 'options',
                displayOptions: {
                    show: {
                        readMode: ['text'],
                    },
                },
                options: [
                    {
                        name: 'UTF-8',
                        value: 'utf8',
                    },
                    {
                        name: 'ASCII',
                        value: 'ascii',
                    },
                    {
                        name: 'UTF-16 LE',
                        value: 'utf16le',
                    },
                    {
                        name: 'Base64',
                        value: 'base64',
                    },
                    {
                        name: 'Hex',
                        value: 'hex',
                    },
                ],
                default: 'utf8',
                description: 'The encoding to use when reading the file',
            },
            {
                displayName: 'Additional Options',
                name: 'additionalOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Include File Stats',
                        name: 'includeStats',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to include file statistics (size, dates, etc.)',
                    },
                    {
                        displayName: 'Property Name',
                        name: 'propertyName',
                        type: 'string',
                        default: 'content',
                        description: 'Name of the property to store the file content',
                    },
                    {
                        displayName: 'Max File Size (MB)',
                        name: 'maxFileSize',
                        type: 'number',
                        default: 10,
                        description: 'Maximum file size in megabytes (0 = no limit)',
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
                const readMode = this.getNodeParameter('readMode', i) as string;
                const encoding = this.getNodeParameter('encoding', i, 'utf8') as string;
                const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as any;

                const propertyName = additionalOptions.propertyName || 'content';
                const includeStats = additionalOptions.includeStats || false;
                const maxFileSize = (additionalOptions.maxFileSize || 0) * 1024 * 1024; // Convert MB to bytes

                // Validate file path
                if (!filePath) {
                    throw new NodeOperationError(this.getNode(), 'File path is required', { itemIndex: i });
                }

                // Resolve absolute path
                const absolutePath = path.resolve(filePath);

                // Check if file exists
                if (!existsSync(absolutePath)) {
                    throw new NodeOperationError(this.getNode(), `File not found: ${absolutePath}`, { itemIndex: i });
                }

                // Get file stats
                const stats = await stat(absolutePath);

                // Check if it's a file (not directory)
                if (!stats.isFile()) {
                    throw new NodeOperationError(this.getNode(), `Path is not a file: ${absolutePath}`, { itemIndex: i });
                }

                // Check file size limit
                if (maxFileSize > 0 && stats.size > maxFileSize) {
                    throw new NodeOperationError(this.getNode(),
                        `File size (${Math.round(stats.size / 1024 / 1024)}MB) exceeds limit (${additionalOptions.maxFileSize}MB)`,
                        { itemIndex: i }
                    );
                }

                let content: any;

                // Read file based on mode
                switch (readMode) {
                    case 'text':
                        content = await fs.readFile(absolutePath, encoding as any);
                        break;
                    case 'binary':
                        const buffer = await fs.readFile(absolutePath);
                        content = buffer.toString('base64');
                        break;
                    case 'json':
                        const jsonContent = await fs.readFile(absolutePath, 'utf8');
                        try {
                            content = JSON.parse(jsonContent);
                        } catch (parseError: any) {
                            throw new NodeOperationError(this.getNode(),
                                `Failed to parse JSON: ${parseError.message}`,
                                { itemIndex: i }
                            );
                        }
                        break;
                    default:
                        throw new NodeOperationError(this.getNode(), `Invalid read mode: ${readMode}`, { itemIndex: i });
                }

                // Prepare return data
                const returnItem: any = {
                    [propertyName]: content,
                    filePath: absolutePath,
                    fileName: path.basename(absolutePath),
                    fileExtension: path.extname(absolutePath),
                    readMode,
                };

                // Include file stats if requested
                if (includeStats) {
                    returnItem.fileStats = {
                        size: stats.size,
                        sizeHuman: formatFileSize(stats.size),
                        created: stats.birthtime,
                        modified: stats.mtime,
                        accessed: stats.atime,
                        isFile: stats.isFile(),
                        isDirectory: stats.isDirectory(),
                        mode: stats.mode,
                        uid: stats.uid,
                        gid: stats.gid,
                    };
                }

                returnData.push({
                    json: returnItem,
                    pairedItem: { item: i },
                });

            } catch (error: any) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error.message,
                            filePath: this.getNodeParameter('filePath', i, ''),
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
