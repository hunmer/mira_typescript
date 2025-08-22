import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';
import { miraCommonNodeConfig } from '../../shared/mira-common-properties';

export class MiraDeviceSendMessage implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Device Send Message',
        name: 'miraDeviceSendMessage',
        ...miraCommonNodeConfig,
        group: ['device'],
        description: 'Send message to a device via Mira App Server',
        defaults: {
            name: 'Mira Device Send Message',
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
                description: 'Client ID of the device to send message to',
                placeholder: 'client-456',
            },
            {
                displayName: 'Message',
                name: 'message',
                type: 'json',
                required: true,
                default: '{}',
                description: 'Message object to send to the device',
                placeholder: '{"type": "notification", "content": "Hello Device!"}',
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
                const message = this.getNodeParameter('message', i) as object;

                // Validate required parameters
                if (!libraryId || libraryId.trim() === '') {
                    throw new Error('Library ID is required and cannot be empty');
                }
                if (!clientId || clientId.trim() === '') {
                    throw new Error('Client ID is required and cannot be empty');
                }
                if (!message || typeof message !== 'object') {
                    throw new Error('Message is required and must be a valid JSON object');
                }

                const options = {
                    method: 'POST' as const,
                    url: '/api/devices/send-message',
                    body: {
                        clientId: clientId.trim(),
                        libraryId: libraryId.trim(),
                        message,
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
                        sentToClientId: clientId.trim(),
                        libraryId: libraryId.trim(),
                        messageSize: JSON.stringify(message).length,
                        operation: 'send_message',
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
