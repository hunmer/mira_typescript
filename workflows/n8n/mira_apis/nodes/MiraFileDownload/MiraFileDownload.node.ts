import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    NodeOperationError,
} from 'n8n-workflow';
import { miraCommonNodeConfig } from '../../shared/mira-common-properties';

export class MiraFileDownload implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira File Download',
        name: 'miraFileDownload',
        ...miraCommonNodeConfig,
        group: ['file'],
        description: 'Download files from Mira App Server library',
        defaults: {
            name: 'Mira File Download',
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
                description: 'Library ID where the file is stored',
                placeholder: '12345',
            },
            {
                displayName: 'File ID',
                name: 'fileId',
                type: 'string',
                required: true,
                default: '',
                description: 'File ID to download',
                placeholder: 'file_abc123',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const libraryId = this.getNodeParameter('libraryId', i) as string;
                const fileId = this.getNodeParameter('fileId', i) as string;

                // Validate required parameters
                if (!libraryId || libraryId.trim() === '') {
                    throw new NodeOperationError(
                        this.getNode(),
                        'Library ID is required and cannot be empty',
                        { itemIndex: i }
                    );
                }

                if (!fileId || fileId.trim() === '') {
                    throw new NodeOperationError(
                        this.getNode(),
                        'File ID is required and cannot be empty',
                        { itemIndex: i }
                    );
                }

                const options = {
                    method: 'GET' as const,
                    url: `/api/files/download/${libraryId.trim()}/${fileId.trim()}`,
                    encoding: null, // Important for binary data
                };

                const response = await this.helpers.httpRequestWithAuthentication.call(
                    this,
                    'MiraApiCredential',
                    options,
                );

                const binaryData = await this.helpers.prepareBinaryData(
                    response as Buffer,
                    `file_${fileId.trim()}`,
                );

                returnData.push({
                    json: {
                        message: 'File downloaded successfully',
                        operation: 'file_download',
                        libraryId: libraryId.trim(),
                        fileId: fileId.trim(),
                        fileName: binaryData.fileName,
                        fileSize: binaryData.fileSize,
                        mimeType: binaryData.mimeType,
                        timestamp: new Date().toISOString(),
                    },
                    binary: {
                        data: binaryData,
                    },
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
