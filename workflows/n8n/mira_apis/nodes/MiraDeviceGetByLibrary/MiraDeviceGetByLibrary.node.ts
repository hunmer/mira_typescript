import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';
import { miraCommonNodeConfig } from '../../shared/mira-common-properties';

export class MiraDeviceGetByLibrary implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Device Get By Library',
        name: 'miraDeviceGetByLibrary',
        ...miraCommonNodeConfig,
        group: ['device'],
        description: 'Get devices for specific library from Mira App Server',
        defaults: {
            name: 'Mira Device Get By Library',
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
                description: 'ID of the library to get devices for',
                placeholder: 'library-123',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const libraryId = this.getNodeParameter('libraryId', i) as string;

                // Validate required parameter
                if (!libraryId || libraryId.trim() === '') {
                    throw new Error('Library ID is required and cannot be empty');
                }

                const options = {
                    method: 'GET' as const,
                    url: `/api/devices/library/${libraryId.trim()}`,
                };

                const response = await this.helpers.httpRequestWithAuthentication.call(
                    this,
                    'MiraApiCredential',
                    options,
                );

                returnData.push({
                    json: response,
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
                throw error;
            }
        }

        return [returnData];
    }
}
