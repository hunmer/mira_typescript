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

export class MiraDeviceSendMessage implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Device Send Message',
        name: 'miraDeviceSendMessage',
        icon: 'fa:paper-plane',
        group: ['device'],
        version: 1,
        description: 'Send message to a device via Mira App Server',
        defaults: {
            name: 'Mira Device Send Message',
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
                description: 'Client ID of the device to send message to',
                placeholder: 'client-456',
            },
            {
                displayName: 'Message',
                name: 'message',
                type: 'json',
                required: true,
                default: '{}',
                description: 'Message object or JSON string to send to the device',
                placeholder: '{"type": "notification", "content": "Hello Device!"}',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return await processMiraItems(
            this,
            async (itemIndex: number): Promise<MiraHttpOptions> => {
                const libraryId = this.getNodeParameter('libraryId', itemIndex) as string;
                const clientId = this.getNodeParameter('clientId', itemIndex) as string;
                const messageParam = this.getNodeParameter('message', itemIndex) as string | object;

                // Validate required parameters
                validateRequiredParameter(this, 'Library ID', libraryId, itemIndex);
                validateRequiredParameter(this, 'Client ID', clientId, itemIndex);

                // Handle message parameter - can be string or object
                let message: object;
                if (typeof messageParam === 'string') {
                    try {
                        message = JSON.parse(messageParam);
                    } catch (error) {
                        throw new Error(`Message must be valid JSON. Parse error: ${(error as Error).message}`);
                    }
                } else if (typeof messageParam === 'object' && messageParam !== null) {
                    message = messageParam;
                } else {
                    throw new Error('Message is required and must be a valid JSON object or JSON string');
                }

                return {
                    method: 'POST',
                    endpoint: '/api/devices/send-message',
                    body: {
                        clientId: clientId.trim(),
                        libraryId: libraryId.trim(),
                        message,
                    },
                };
            },
            (response: any, itemIndex: number) => {
                const libraryId = this.getNodeParameter('libraryId', itemIndex) as string;
                const clientId = this.getNodeParameter('clientId', itemIndex) as string;
                const messageParam = this.getNodeParameter('message', itemIndex) as string | object;

                // Parse message for size calculation
                let parsedMessage: object;
                if (typeof messageParam === 'string') {
                    parsedMessage = JSON.parse(messageParam);
                } else {
                    parsedMessage = messageParam as object;
                }

                return {
                    ...response,
                    sentToClientId: clientId.trim(),
                    libraryId: libraryId.trim(),
                    messageSize: JSON.stringify(parsedMessage).length,
                    operation: 'send_message',
                    timestamp: new Date().toISOString(),
                };
            }
        );
    }
}
