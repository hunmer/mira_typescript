import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';
import { miraTokenProperties, miraTokenCredentials } from '../../shared/mira-common-properties';
import { processMiraItems, validateRequiredParameter } from '../../shared/mira-http-helper';
import { MiraHttpOptions } from '../../shared/mira-auth-helper';

export class MiraDeviceDisconnect implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Device Disconnect',
        name: 'miraDeviceDisconnect',
        icon: 'fa:unlink',
        group: ['device'],
        version: 1,
        description: 'Disconnect a device from Mira App Server',
        defaults: {
            name: 'Mira Device Disconnect',
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
        return await processMiraItems(
            this,
            async (itemIndex: number): Promise<MiraHttpOptions> => {
                const libraryId = this.getNodeParameter('libraryId', itemIndex) as string;
                const clientId = this.getNodeParameter('clientId', itemIndex) as string;

                // Validate required parameters
                validateRequiredParameter(this, 'Library ID', libraryId, itemIndex);
                validateRequiredParameter(this, 'Client ID', clientId, itemIndex);

                return {
                    method: 'POST',
                    endpoint: '/api/devices/disconnect',
                    body: {
                        clientId: clientId.trim(),
                        libraryId: libraryId.trim(),
                    },
                };
            },
            (response: any, itemIndex: number) => {
                const libraryId = this.getNodeParameter('libraryId', itemIndex) as string;
                const clientId = this.getNodeParameter('clientId', itemIndex) as string;

                return {
                    ...response,
                    disconnectedClientId: clientId.trim(),
                    libraryId: libraryId.trim(),
                    operation: 'disconnect',
                    timestamp: new Date().toISOString(),
                };
            }
        );
    }
}
