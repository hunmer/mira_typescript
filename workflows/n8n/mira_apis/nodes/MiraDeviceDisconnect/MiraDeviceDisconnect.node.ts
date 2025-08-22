import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';
import { miraCommonNodeConfig } from '../../shared/mira-common-properties';

export class MiraDeviceDisconnect implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Device Disconnect',
        name: 'miraDeviceDisconnect',
        ...miraCommonNodeConfig,
        group: ['device'],
        description: 'Disconnect a device from Mira App Server',
        defaults: {
            name: 'Mira Device Disconnect',
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
                description: 'ID of the library the device belongs to',
                placeholder: 'library-123',
            },
            {
                displayName: 'Client ID',
                name: 'clientId',
                type: 'string',
                required: true,
                default: '',
                description: 'Client ID of the device to disconnect',
                placeholder: 'client-456',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const libraryId = this.getNodeParameter('libraryId', i) as string;
                const clientId = this.getNodeParameter('clientId', i) as string;

                // Validate required parameters
                if (!libraryId || libraryId.trim() === '') {
                    throw new Error('Library ID is required and cannot be empty');
                }
                if (!clientId || clientId.trim() === '') {
                    throw new Error('Client ID is required and cannot be empty');
                }

                const options = {
                    method: 'POST' as const,
                    url: '/api/devices/disconnect',
                    body: {
                        clientId: clientId.trim(),
                        libraryId: libraryId.trim(),
                    },
                };

                const response = await this.helpers.httpRequestWithAuthentication.call(
                    this,
                    'MiraApiCredential',
                    options,
                );

                returnData.push({
                    json: {
                        ...response,
                        disconnectedClientId: clientId.trim(),
                        libraryId: libraryId.trim(),
                        operation: 'disconnect',
                        timestamp: new Date().toISOString(),
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
                throw error;
            }
        }

        return [returnData];
    }
}
