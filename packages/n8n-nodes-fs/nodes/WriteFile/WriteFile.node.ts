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
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';

// Helper function to format file size
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export class WriteFile implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Write File',
        name: 'writeFile',
        icon: 'fa:download',
        group: ['output'],
        version: 1,
        description: 'Write content to a file',
        defaults: {
            name: 'Write File',
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
                description: 'The path where the file should be written',
            },
            {
                displayName: 'Content Source',
                name: 'contentSource',
                type: 'options',
                options: [
                    {
                        name: 'Text Input',
                        value: 'text',
                        description: 'Enter text content directly',
                    },
                    {
                        name: 'Binary Data',
                        value: 'binary',
                        description: 'Write binary data (base64 encoded)',
                    },
                    {
                        name: 'Input Binary Field',
                        value: 'inputBinary',
                        description: 'Get binary data from previous node',
                    },
                    {
                        name: 'JSON Object',
                        value: 'json',
                        description: 'Write JSON object as formatted text',
                    },
                    {
                        name: 'From Property',
                        value: 'property',
                        description: 'Get content from input data property',
                    },
                ],
                default: 'text',
                description: 'Source of the content to write',
            },
            {
                displayName: 'Content',
                name: 'content',
                type: 'string',
                displayOptions: {
                    show: {
                        contentSource: ['text'],
                    },
                },
                default: '',
                placeholder: 'Enter your content here...',
                description: 'The text content to write to the file',
                typeOptions: {
                    rows: 4,
                },
            },
            {
                displayName: 'Binary Data (Base64)',
                name: 'binaryContent',
                type: 'string',
                displayOptions: {
                    show: {
                        contentSource: ['binary'],
                    },
                },
                default: '',
                placeholder: 'Enter base64 encoded binary data...',
                description: 'Base64 encoded binary data to write',
            },
            {
                displayName: 'Binary Field Name',
                name: 'binaryFieldName',
                type: 'string',
                displayOptions: {
                    show: {
                        contentSource: ['inputBinary'],
                    },
                },
                default: 'data',
                placeholder: 'data',
                description: 'Name of the binary field from the previous node',
            },
            {
                displayName: 'JSON Object',
                name: 'jsonContent',
                type: 'json',
                displayOptions: {
                    show: {
                        contentSource: ['json'],
                    },
                },
                default: '{}',
                description: 'JSON object to write as formatted text',
            },
            {
                displayName: 'Property Name',
                name: 'propertyName',
                type: 'string',
                displayOptions: {
                    show: {
                        contentSource: ['property'],
                    },
                },
                default: 'content',
                description: 'Name of the property containing the content to write',
            },
            {
                displayName: 'Write Mode',
                name: 'writeMode',
                type: 'options',
                options: [
                    {
                        name: 'Overwrite',
                        value: 'overwrite',
                        description: 'Overwrite existing file or create new one',
                    },
                    {
                        name: 'Append',
                        value: 'append',
                        description: 'Append to existing file or create new one',
                    },
                    {
                        name: 'Create Only',
                        value: 'create',
                        description: 'Create new file only (fail if exists)',
                    },
                ],
                default: 'overwrite',
                description: 'How to write the file',
            },
            {
                displayName: 'Encoding',
                name: 'encoding',
                type: 'options',
                displayOptions: {
                    show: {
                        contentSource: ['text', 'json', 'property'],
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
                description: 'The encoding to use when writing the file',
            },
            {
                displayName: 'Additional Options',
                name: 'additionalOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Create Parent Directories',
                        name: 'createParentDirs',
                        type: 'boolean',
                        default: true,
                        description: 'Whether to create parent directories if they don\'t exist',
                    },
                    {
                        displayName: 'File Mode (Permissions)',
                        name: 'fileMode',
                        type: 'string',
                        default: '0644',
                        description: 'File permissions in octal notation (e.g., 0644)',
                    },
                    {
                        displayName: 'JSON Formatting',
                        name: 'jsonFormatting',
                        type: 'options',
                        displayOptions: {
                            show: {
                                '/contentSource': ['json'],
                            },
                        },
                        options: [
                            {
                                name: 'Pretty (Indented)',
                                value: 'pretty',
                            },
                            {
                                name: 'Compact',
                                value: 'compact',
                            },
                        ],
                        default: 'pretty',
                        description: 'How to format JSON output',
                    },
                    {
                        displayName: 'Backup Existing File',
                        name: 'createBackup',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to create a backup of existing file before overwriting',
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
                const contentSource = this.getNodeParameter('contentSource', i) as string;
                const writeMode = this.getNodeParameter('writeMode', i) as string;
                const encoding = this.getNodeParameter('encoding', i, 'utf8') as string;
                const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as any;

                const createParentDirs = additionalOptions.createParentDirs !== false;
                const fileMode = additionalOptions.fileMode || '0644';
                const jsonFormatting = additionalOptions.jsonFormatting || 'pretty';
                const createBackup = additionalOptions.createBackup || false;

                // Validate file path
                if (!filePath) {
                    throw new NodeOperationError(this.getNode(), 'File path is required', { itemIndex: i });
                }

                // Resolve absolute path
                const absolutePath = path.resolve(filePath);

                // Check if file exists for different write modes
                const fileExists = existsSync(absolutePath);

                if (writeMode === 'create' && fileExists) {
                    throw new NodeOperationError(this.getNode(),
                        `File already exists and write mode is 'create only': ${absolutePath}`,
                        { itemIndex: i }
                    );
                }

                // Create parent directories if needed
                if (createParentDirs) {
                    const parentDir = path.dirname(absolutePath);
                    if (!existsSync(parentDir)) {
                        mkdirSync(parentDir, { recursive: true });
                    }
                }

                // Create backup if requested and file exists
                if (createBackup && fileExists) {
                    const backupPath = `${absolutePath}.backup.${Date.now()}`;
                    await fs.copyFile(absolutePath, backupPath);
                }

                // Get content based on source
                let content: string | Buffer;

                switch (contentSource) {
                    case 'text':
                        content = this.getNodeParameter('content', i) as string;
                        break;
                    case 'binary':
                        const binaryContent = this.getNodeParameter('binaryContent', i) as string;
                        content = Buffer.from(binaryContent, 'base64');
                        break;
                    case 'inputBinary':
                        const binaryFieldName = this.getNodeParameter('binaryFieldName', i) as string;
                        const binaryData = this.helpers.assertBinaryData(i, binaryFieldName);
                        content = await this.helpers.getBinaryDataBuffer(i, binaryFieldName);
                        break;
                    case 'json':
                        const jsonContent = this.getNodeParameter('jsonContent', i) as object;
                        content = jsonFormatting === 'pretty'
                            ? JSON.stringify(jsonContent, null, 2)
                            : JSON.stringify(jsonContent);
                        break;
                    case 'property':
                        const propertyName = this.getNodeParameter('propertyName', i) as string;
                        const propertyValue = items[i].json[propertyName];
                        if (propertyValue === undefined) {
                            throw new NodeOperationError(this.getNode(),
                                `Property '${propertyName}' not found in input data`,
                                { itemIndex: i }
                            );
                        }
                        content = typeof propertyValue === 'string'
                            ? propertyValue
                            : JSON.stringify(propertyValue, null, 2);
                        break;
                    default:
                        throw new NodeOperationError(this.getNode(),
                            `Invalid content source: ${contentSource}`,
                            { itemIndex: i }
                        );
                }

                // Write file based on mode
                const writeOptions: any = {
                    encoding: (contentSource === 'binary' || contentSource === 'inputBinary') ? undefined : encoding as any,
                    mode: parseInt(fileMode, 8),
                };

                if (writeMode === 'append') {
                    writeOptions.flag = 'a';
                }

                await fs.writeFile(absolutePath, content, writeOptions);

                // Get file stats after writing
                const stats = await fs.stat(absolutePath);

                // Prepare return data
                const returnItem: any = {
                    success: true,
                    filePath: absolutePath,
                    fileName: path.basename(absolutePath),
                    fileExtension: path.extname(absolutePath),
                    writeMode,
                    contentSource,
                    bytesWritten: stats.size,
                    sizeHuman: formatFileSize(stats.size),
                    created: stats.birthtime,
                    modified: stats.mtime,
                };

                if (contentSource === 'text' || contentSource === 'property') {
                    returnItem.encoding = encoding;
                }

                if (contentSource === 'inputBinary') {
                    returnItem.binaryFieldName = this.getNodeParameter('binaryFieldName', i);
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
