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

export class CreateDirectory implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Create Directory',
        name: 'createDirectory',
        icon: 'fa:folder-plus',
        group: ['output'],
        version: 1,
        description: 'Create directories with optional nested structure',
        defaults: {
            name: 'Create Directory',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        properties: [
            {
                displayName: 'Directory Path',
                name: 'directoryPath',
                type: 'string',
                required: true,
                default: '',
                placeholder: '/path/to/new/directory',
                description: 'The path of the directory to create',
            },
            {
                displayName: 'Creation Options',
                name: 'creationOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Recursive Creation',
                        name: 'recursive',
                        type: 'boolean',
                        default: true,
                        description: 'Whether to create parent directories if they don\'t exist',
                    },
                    {
                        displayName: 'Directory Mode (Permissions)',
                        name: 'directoryMode',
                        type: 'string',
                        default: '0755',
                        description: 'Directory permissions in octal notation (e.g., 0755)',
                    },
                    {
                        displayName: 'Skip if Exists',
                        name: 'skipIfExists',
                        type: 'boolean',
                        default: true,
                        description: 'Whether to skip without error if directory already exists',
                    },
                    {
                        displayName: 'Create Parent Structure Only',
                        name: 'parentsOnly',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to create only parent directories, not the final directory',
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
                const directoryPath = this.getNodeParameter('directoryPath', i) as string;
                const creationOptions = this.getNodeParameter('creationOptions', i, {}) as any;

                const recursive = creationOptions.recursive !== false;
                const directoryMode = creationOptions.directoryMode || '0755';
                const skipIfExists = creationOptions.skipIfExists !== false;
                const parentsOnly = creationOptions.parentsOnly || false;

                // Validate directory path
                if (!directoryPath) {
                    throw new NodeOperationError(this.getNode(), 'Directory path is required', { itemIndex: i });
                }

                // Resolve absolute path
                const absolutePath = path.resolve(directoryPath);
                const targetPath = parentsOnly ? path.dirname(absolutePath) : absolutePath;

                // Check if directory already exists
                const alreadyExists = existsSync(targetPath);

                if (alreadyExists) {
                    if (skipIfExists) {
                        returnData.push({
                            json: {
                                success: true,
                                created: false,
                                skipped: true,
                                message: 'Directory already exists, skipped as requested',
                                path: targetPath,
                                name: path.basename(targetPath),
                            },
                            pairedItem: { item: i },
                        });
                        continue;
                    } else {
                        throw new NodeOperationError(this.getNode(),
                            `Directory already exists: ${targetPath}`,
                            { itemIndex: i }
                        );
                    }
                }

                // Create directory
                const creationStartTime = Date.now();

                const mkdirOptions: any = {
                    mode: parseInt(directoryMode, 8),
                };

                if (recursive) {
                    mkdirOptions.recursive = true;
                }

                await fs.mkdir(targetPath, mkdirOptions);

                const creationEndTime = Date.now();

                // Get directory stats after creation
                const stats = await fs.stat(targetPath);

                // Prepare return data
                const returnItem: any = {
                    success: true,
                    created: true,
                    path: targetPath,
                    name: path.basename(targetPath),
                    parentDirectory: path.dirname(targetPath),
                    creationTime: creationEndTime - creationStartTime,
                    createdAt: new Date().toISOString(),
                    permissions: {
                        mode: stats.mode,
                        octal: '0' + (stats.mode & parseInt('777', 8)).toString(8),
                    },
                    owner: {
                        uid: stats.uid,
                        gid: stats.gid,
                    },
                    recursive,
                    parentsOnly,
                };

                returnData.push({
                    json: returnItem,
                    pairedItem: { item: i },
                });

            } catch (error: any) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            success: false,
                            created: false,
                            error: error.message,
                            path: this.getNodeParameter('directoryPath', i, ''),
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
}
