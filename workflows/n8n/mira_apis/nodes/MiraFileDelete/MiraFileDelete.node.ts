import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    NodeOperationError,
} from 'n8n-workflow';
import { miraCommonNodeConfig, miraTokenProperties, miraTokenCredentials } from '../../shared/mira-common-properties';
import { getMiraAuthConfig } from '../../shared/mira-auth-helper';

export class MiraFileDelete implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira File Delete',
        name: 'miraFileDelete',
        ...miraCommonNodeConfig,
        group: ['file'],
        description: 'Delete files from Mira App Server library',
        defaults: {
            name: 'Mira File Delete',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: miraTokenCredentials,
        properties: [
            ...miraTokenProperties,
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
                description: 'File ID to delete (numeric ID from the database)',
                placeholder: '123',
            },
            {
                displayName: '⚠️ Warning: This will permanently delete the file',
                name: 'confirmation',
                type: 'notice',
                default: '',
                typeOptions: {
                    theme: 'warning',
                },
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

                // Get authentication configuration
                const authConfig = await getMiraAuthConfig(this, i);

                const options = {
                    method: 'DELETE' as const,
                    url: `${authConfig.serverUrl}/api/files/${libraryId.trim()}/${fileId.trim()}`,
                    headers: {
                        'Authorization': `Bearer ${authConfig.token}`,
                    },
                };

                const response = await this.helpers.httpRequest(options);

                // Enhance response with delete metadata
                const enhancedResponse = {
                    ...response,
                    operation: 'file_delete',
                    deletedFileId: fileId.trim(),
                    libraryId: libraryId.trim(),
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
