import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    NodeOperationError,
} from 'n8n-workflow';
import { miraCommonNodeConfig, miraTokenProperties, miraTokenCredentials } from '../../shared/mira-common-properties';
import { processMiraItems } from '../../shared/mira-http-helper';
import { MiraHttpOptions } from '../../shared/mira-auth-helper';

export class MiraDeviceGetByLibrary implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Device Get By Library',
        name: 'miraDeviceGetByLibrary',
        ...miraCommonNodeConfig,
        group: ['mira-device'],
        description: 'Get devices for specific library from Mira App Server',
        defaults: {
            name: 'Mira Device Get By Library',
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
                description: 'ID of the library to get devices for',
                placeholder: 'library-123',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return await processMiraItems(
            this,
            async (itemIndex: number): Promise<MiraHttpOptions> => {
                const libraryId = this.getNodeParameter('libraryId', itemIndex) as string;

                if (!libraryId || libraryId.trim() === '') {
                    throw new NodeOperationError(this.getNode(), 'Library ID is required and cannot be empty', {
                        itemIndex,
                    });
                }

                return {
                    method: 'GET',
                    endpoint: `/api/devices/library/${libraryId.trim()}`,
                };
            },
            (response: any, itemIndex: number) => {
                const libraryId = this.getNodeParameter('libraryId', itemIndex) as string;
                return {
                    libraryId: libraryId.trim(),
                    devices: response,
                    count: Array.isArray(response) ? response.length : 0,
                    timestamp: new Date().toISOString(),
                    operation: 'getByLibrary',
                };
            }
        );
    }
}
