import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class MiraSystem implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira System',
        name: 'miraSystem',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Get system status from Mira App Server',
        defaults: {
            name: 'Mira System',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'miraApi',
                required: false,
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
                        name: 'System',
                        value: 'system',
                    },
                ],
                default: 'system',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['system'],
                    },
                },
                options: [
                    {
                        name: 'Health Check',
                        value: 'healthCheck',
                        description: 'Get detailed system health status',
                        action: 'Get detailed system health status',
                    },
                    {
                        name: 'Simple Health Check',
                        value: 'simpleHealthCheck',
                        description: 'Get simple health status',
                        action: 'Get simple health status',
                    },
                ],
                default: 'healthCheck',
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
                if (resource === 'system') {
                    if (operation === 'healthCheck') {
                        const options = {
                            method: 'GET',
                            url: '/api/health',
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

                    } else if (operation === 'simpleHealthCheck') {
                        const options = {
                            method: 'GET' as IHttpRequestMethods,
                            url: '/health',
                        };

                        // Simple health check doesn't require authentication
                        const response = await this.helpers.httpRequest(options);
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
