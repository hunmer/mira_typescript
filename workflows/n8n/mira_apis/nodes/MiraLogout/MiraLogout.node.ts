import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class MiraLogout implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Logout',
        name: 'miraLogout',
        icon: 'file:mira.svg',
        group: ['mira-auth'],
        version: 1,
        description: 'Logout from Mira App Server and revoke access token',
        defaults: {
            name: 'Mira Logout',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'MiraApiCredential',
                required: false,
                displayOptions: {
                    show: {
                        tokenSource: ['credentials'],
                    },
                },
            },
        ],
        properties: [
            {
                displayName: 'Token Source',
                name: 'tokenSource',
                type: 'options',
                options: [
                    {
                        name: 'From Credentials',
                        value: 'credentials',
                        description: 'Use token from Mira API credentials',
                    },
                    {
                        name: 'From Input',
                        value: 'input',
                        description: 'Use token from input data (e.g., from login operation)',
                    },
                ],
                default: 'input',
                description: 'Choose where to get the access token from',
            },
            {
                displayName: 'Server URL',
                name: 'serverUrl',
                type: 'string',
                displayOptions: {
                    show: {
                        tokenSource: ['input'],
                    },
                },
                default: 'http://localhost:8081',
                description: 'The URL of the Mira App Server',
            },
            {
                displayName: 'Access Token',
                name: 'accessToken',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                displayOptions: {
                    show: {
                        tokenSource: ['input'],
                    },
                },
                default: '',
                description: 'Access token for authentication. Can use expressions like {{ $json.accessToken }}',
                placeholder: '{{ $json.accessToken }}',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const tokenSource = this.getNodeParameter('tokenSource', i) as string;
                let serverUrl: string;
                let token: string;

                if (tokenSource === 'credentials') {
                    // Get server URL and token from credentials
                    const credentials = await this.getCredentials('MiraApiCredential');
                    serverUrl = credentials.serverUrl as string;

                    const options = {
                        method: 'POST' as IHttpRequestMethods,
                        url: `${serverUrl}/api/auth/logout`,
                    };

                    const response = await this.helpers.httpRequestWithAuthentication.call(
                        this,
                        'MiraApiCredential',
                        options,
                    );
                    returnData.push({
                        json: response || { success: true, message: 'Logged out successfully' },
                        pairedItem: { item: i },
                    });
                } else {
                    // Get token from input parameter
                    token = this.getNodeParameter('accessToken', i) as string;
                    serverUrl = this.getNodeParameter('serverUrl', i) as string;

                    const options = {
                        method: 'POST' as IHttpRequestMethods,
                        url: `${serverUrl}/api/auth/logout`,
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    };

                    const response = await this.helpers.httpRequest(options);
                    returnData.push({
                        json: response || { success: true, message: 'Logged out successfully' },
                        pairedItem: { item: i },
                    });
                }
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
