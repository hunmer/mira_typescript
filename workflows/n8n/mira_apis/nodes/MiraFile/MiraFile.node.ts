import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';

export class MiraFile implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira File',
        name: 'miraFile',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Manage files with Mira App Server',
        defaults: {
            name: 'Mira File',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'miraApi',
                required: true,
            },
        ],
        requestDefaults: {
            baseURL: '={{$credentials.serverUrl}}',
            headers: {
                Accept: 'application/json',
            },
        },
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'File',
                        value: 'file',
                    },
                ],
                default: 'file',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['file'],
                    },
                },
                options: [
                    {
                        name: 'Upload',
                        value: 'upload',
                        description: 'Upload files to library',
                        action: 'Upload files to library',
                    },
                    {
                        name: 'Download',
                        value: 'download',
                        description: 'Download a file',
                        action: 'Download a file',
                    },
                    {
                        name: 'Delete',
                        value: 'delete',
                        description: 'Delete a file',
                        action: 'Delete a file',
                    },
                ],
                default: 'upload',
            },
            // Common fields
            {
                displayName: 'Library ID',
                name: 'libraryId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['upload', 'download', 'delete'],
                    },
                },
                description: 'Target library ID',
            },
            {
                displayName: 'File ID',
                name: 'fileId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['download', 'delete'],
                    },
                },
                description: 'File ID to download or delete',
            },
            // Upload specific fields
            {
                displayName: 'Input Binary Field',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['upload'],
                    },
                },
                description: 'Name of the binary property containing the file to upload',
            },
            {
                displayName: 'Source Path',
                name: 'sourcePath',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['upload'],
                    },
                },
                description: 'Local file path for validation',
            },
            {
                displayName: 'Client ID',
                name: 'clientId',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['upload'],
                    },
                },
                description: 'Client ID (optional)',
            },
            {
                displayName: 'Tags',
                name: 'tags',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['upload'],
                    },
                },
                description: 'Comma-separated list of tags',
            },
            {
                displayName: 'Folder ID',
                name: 'folderId',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['upload'],
                    },
                },
                description: 'Target folder ID',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);

        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'file') {
                    if (operation === 'upload') {
                        const libraryId = this.getNodeParameter('libraryId', i) as string;
                        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
                        const sourcePath = this.getNodeParameter('sourcePath', i) as string;
                        const clientId = this.getNodeParameter('clientId', i) as string;
                        const tags = this.getNodeParameter('tags', i) as string;
                        const folderId = this.getNodeParameter('folderId', i) as string;

                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

                        const formData: any = {
                            libraryId,
                            sourcePath,
                            payload: JSON.stringify({
                                data: {
                                    tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
                                    folder_id: folderId,
                                },
                            }),
                        };

                        if (clientId) {
                            formData.clientId = clientId;
                        }

                        const options = {
                            method: 'POST',
                            url: '/api/files/upload',
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                            formData: {
                                ...formData,
                                files: {
                                    value: await this.helpers.getBinaryDataBuffer(i, binaryPropertyName),
                                    options: {
                                        filename: binaryData.fileName || 'file',
                                        contentType: binaryData.mimeType,
                                    },
                                },
                            },
                        };

                        const response = await this.helpers.httpRequestWithAuthentication.call(
                            this,
                            'miraApi',
                            options,
                        );
                        returnData.push({
                            json: response,
                            pairedItem: { item: i },
                        });

                    } else if (operation === 'download') {
                        const libraryId = this.getNodeParameter('libraryId', i) as string;
                        const fileId = this.getNodeParameter('fileId', i) as string;

                        const options = {
                            method: 'GET',
                            url: `/api/files/download/${libraryId}/${fileId}`,
                            encoding: null, // Important for binary data
                        };

                        const response = await this.helpers.httpRequestWithAuthentication.call(
                            this,
                            'miraApi',
                            options,
                        );

                        const binaryData = await this.helpers.prepareBinaryData(
                            response as Buffer,
                            `file_${fileId}`,
                        );

                        returnData.push({
                            json: { message: 'File downloaded successfully' },
                            binary: {
                                data: binaryData,
                            },
                            pairedItem: { item: i },
                        });

                    } else if (operation === 'delete') {
                        const libraryId = this.getNodeParameter('libraryId', i) as string;
                        const fileId = this.getNodeParameter('fileId', i) as string;

                        const options = {
                            method: 'DELETE',
                            url: `/api/files/${libraryId}/${fileId}`,
                        };

                        const response = await this.helpers.httpRequestWithAuthentication.call(
                            this,
                            'miraApi',
                            options,
                        );
                        returnData.push({
                            json: response,
                            pairedItem: { item: i },
                        });
                    }
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: (error as Error).message },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error as Error, {
                    itemIndex: i,
                });
            }
        }

        return [returnData];
    }
}
