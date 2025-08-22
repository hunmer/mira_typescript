import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    NodeOperationError,
} from 'n8n-workflow';
import { miraCommonNodeConfig } from '../../shared/mira-common-properties';

export class MiraFileUpload implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira File Upload',
        name: 'miraFileUpload',
        ...miraCommonNodeConfig,
        group: ['file'],
        description: 'Upload files to library in Mira App Server',
        defaults: {
            name: 'Mira File Upload',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'MiraApiCredential',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Library ID',
                name: 'libraryId',
                type: 'string',
                required: true,
                default: '',
                description: 'Target library ID for file upload',
                placeholder: '12345',
            },
            {
                displayName: 'Input Binary Field',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                description: 'Name of the binary property containing the file to upload',
            },
            {
                displayName: 'Source Path',
                name: 'sourcePath',
                type: 'string',
                default: '',
                description: 'Local file path for validation (optional)',
            },
            {
                displayName: 'Client ID',
                name: 'clientId',
                type: 'string',
                default: '',
                description: 'Client ID (optional)',
            },
            {
                displayName: 'Tags',
                name: 'tags',
                type: 'string',
                default: '',
                description: 'Comma-separated list of tags (optional)',
                placeholder: 'tag1, tag2, tag3',
            },
            {
                displayName: 'Folder ID',
                name: 'folderId',
                type: 'string',
                default: '',
                description: 'Target folder ID (optional)',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const libraryId = this.getNodeParameter('libraryId', i) as string;
                const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
                const sourcePath = this.getNodeParameter('sourcePath', i) as string;
                const clientId = this.getNodeParameter('clientId', i) as string;
                const tags = this.getNodeParameter('tags', i) as string;
                const folderId = this.getNodeParameter('folderId', i) as string;

                // Validate required parameters
                if (!libraryId || libraryId.trim() === '') {
                    throw new NodeOperationError(
                        this.getNode(),
                        'Library ID is required and cannot be empty',
                        { itemIndex: i }
                    );
                }

                const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

                const formData: any = {
                    libraryId: libraryId.trim(),
                    sourcePath,
                    payload: JSON.stringify({
                        data: {
                            tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
                            folder_id: folderId,
                        },
                    }),
                };

                if (clientId && clientId.trim()) {
                    formData.clientId = clientId.trim();
                }

                const options = {
                    method: 'POST' as const,
                    url: '/api/files/upload',
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    formData: {
                        ...formData,
                        files: {
                            value: await this.helpers.getBinaryDataBuffer(i, binaryPropertyName),
                            options: {
                                filename: binaryData.fileName || 'uploaded_file',
                                contentType: binaryData.mimeType || 'application/octet-stream',
                            },
                        },
                    },
                };

                const response = await this.helpers.httpRequestWithAuthentication.call(
                    this,
                    'MiraApiCredential',
                    options,
                );

                // Enhance response with upload metadata
                const enhancedResponse = {
                    ...response,
                    operation: 'file_upload',
                    libraryId: libraryId.trim(),
                    fileName: binaryData.fileName || 'uploaded_file',
                    fileSize: binaryData.fileSize,
                    mimeType: binaryData.mimeType,
                    timestamp: new Date().toISOString(),
                };

                returnData.push({
                    json: enhancedResponse,
                    pairedItem: { item: i },
                });
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
