import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class MiraSystemHealthSimple implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira System Health Simple',
        name: 'miraSystemHealthSimple',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        description: 'Get simple health status from Mira App Server (no authentication required)',
        defaults: {
            name: 'Mira System Health Simple',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'MiraApiCredential',
                required: false,
            },
        ],
        requestDefaults: {
            baseURL: '={{$credentials.serverUrl || "http://localhost:8081"}}',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        },
        properties: [
            {
                displayName: 'Server URL',
                name: 'serverUrl',
                type: 'string',
                default: 'http://localhost:8081',
                description: 'The URL of the Mira App Server (required since no credentials)',
                displayOptions: {
                    hide: {
                        '@version': [{ _cnd: { exists: true } }],
                    },
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const serverUrl = this.getNodeParameter('serverUrl', i) as string || 'http://localhost:8081';

                const options = {
                    method: 'GET' as IHttpRequestMethods,
                    url: `${serverUrl}/health`,
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                };

                // Simple health check doesn't require authentication
                const response = await this.helpers.httpRequest(options);

                returnData.push({
                    json: {
                        healthStatus: response,
                        checkType: 'simple',
                        serverUrl,
                        timestamp: new Date().toISOString(),
                        operation: 'simpleHealthCheck',
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
