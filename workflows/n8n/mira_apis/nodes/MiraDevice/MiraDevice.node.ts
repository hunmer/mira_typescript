import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';

export class MiraDevice implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Device',
        name: 'miraDevice',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Manage devices with Mira App Server',
        defaults: {
            name: 'Mira Device',
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
                'Content-Type': 'application/json',
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
                        name: 'Device',
                        value: 'device',
                    },
                ],
                default: 'device',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['device'],
                    },
                },
                options: [
                    {
                        name: 'List All',
                        value: 'listAll',
                        description: 'Get all device connections',
                        action: 'Get all device connections',
                    },
                    {
                        name: 'Get By Library',
                        value: 'getByLibrary',
                        description: 'Get devices for specific library',
                        action: 'Get devices for specific library',
                    },
                    {
                        name: 'Disconnect',
                        value: 'disconnect',
                        description: 'Disconnect a device',
                        action: 'Disconnect a device',
                    },
                    {
                        name: 'Send Message',
                        value: 'sendMessage',
                        description: 'Send message to device',
                        action: 'Send message to device',
                    },
                    {
                        name: 'Get Stats',
                        value: 'getStats',
                        description: 'Get device statistics',
                        action: 'Get device statistics',
                    },
                ],
                default: 'listAll',
            },
            {
                displayName: 'Library ID',
                name: 'libraryId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['getByLibrary', 'disconnect', 'sendMessage'],
                    },
                },
                description: 'Library ID',
            },
            {
                displayName: 'Client ID',
                name: 'clientId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['disconnect', 'sendMessage'],
                    },
                },
                description: 'Client ID of the device',
            },
            {
                displayName: 'Message',
                name: 'message',
                type: 'json',
                required: true,
                default: '{}',
                displayOptions: {
                    show: {
                        operation: ['sendMessage'],
                    },
                },
                description: 'Message object to send to device',
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
                if (resource === 'device') {
                    if (operation === 'listAll') {
                        const options = {
                            method: 'GET',
                            url: '/api/devices',
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

                    } else if (operation === 'getByLibrary') {
                        const libraryId = this.getNodeParameter('libraryId', i) as string;

                        const options = {
                            method: 'GET',
                            url: `/api/devices/library/${libraryId}`,
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

                    } else if (operation === 'disconnect') {
                        const libraryId = this.getNodeParameter('libraryId', i) as string;
                        const clientId = this.getNodeParameter('clientId', i) as string;

                        const options = {
                            method: 'POST',
                            url: '/api/devices/disconnect',
                            body: {
                                clientId,
                                libraryId,
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

                    } else if (operation === 'sendMessage') {
                        const libraryId = this.getNodeParameter('libraryId', i) as string;
                        const clientId = this.getNodeParameter('clientId', i) as string;
                        const message = this.getNodeParameter('message', i) as object;

                        const options = {
                            method: 'POST',
                            url: '/api/devices/send-message',
                            body: {
                                clientId,
                                libraryId,
                                message,
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

                    } else if (operation === 'getStats') {
                        const options = {
                            method: 'GET',
                            url: '/api/devices/stats',
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
