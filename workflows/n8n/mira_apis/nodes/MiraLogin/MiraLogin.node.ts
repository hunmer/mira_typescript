import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class MiraLogin implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Login',
        name: 'miraLogin',
        icon: 'file:mira.svg',
        group: ['mira-auth'],
        version: 1,
        description: 'Login to Mira App Server to get access token',
        defaults: {
            name: 'Mira Login',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'MiraLoginCredential',
                required: true,
            },
        ],
        properties: [
            // No additional properties needed - all info comes from credentials
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                // Use credentials only
                const credentials = await this.getCredentials('MiraLoginCredential');
                const serverUrl = credentials.serverUrl as string;
                const username = credentials.username as string;
                const password = credentials.password as string;

                const options = {
                    method: 'POST' as IHttpRequestMethods,
                    url: `${serverUrl}/api/auth/login`,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username,
                        password,
                    }),
                };

                const response = await this.helpers.httpRequest(options);
                returnData.push({
                    json: response,
                    pairedItem: { item: i },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
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
