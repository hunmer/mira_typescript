import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class MiraAuth implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Auth',
        name: 'miraAuth',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Manage authentication with Mira App Server',
        defaults: {
            name: 'Mira Auth',
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
                        name: 'Authentication',
                        value: 'auth',
                    },
                ],
                default: 'auth',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['auth'],
                    },
                },
                options: [
                    {
                        name: 'Login',
                        value: 'login',
                        description: 'Login to get access token',
                        action: 'Login to get access token',
                    },
                    {
                        name: 'Logout',
                        value: 'logout',
                        description: 'Logout and revoke access token',
                        action: 'Logout and revoke access token',
                    },
                    {
                        name: 'Verify Token',
                        value: 'verify',
                        description: 'Verify current access token',
                        action: 'Verify current access token',
                    },
                    {
                        name: 'Get Permission Codes',
                        value: 'getCodes',
                        description: 'Get permission codes for current user',
                        action: 'Get permission codes for current user',
                    },
                ],
                default: 'login',
            },
            // Login operation fields
            {
                displayName: 'Server URL',
                name: 'serverUrl',
                type: 'string',
                required: true,
                default: 'http://localhost:8081',
                displayOptions: {
                    show: {
                        operation: ['login'],
                    },
                },
                description: 'The URL of the Mira App Server',
            },
            {
                displayName: 'Username',
                name: 'username',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['login'],
                    },
                },
                description: 'Username for authentication',
            },
            {
                displayName: 'Password',
                name: 'password',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['login'],
                    },
                },
                description: 'Password for authentication',
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
                if (resource === 'auth') {
                    if (operation === 'login') {
                        const serverUrl = this.getNodeParameter('serverUrl', i) as string;
                        const username = this.getNodeParameter('username', i) as string;
                        const password = this.getNodeParameter('password', i) as string;

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

                    } else if (operation === 'logout') {
                        const options = {
                            method: 'POST',
                            url: '/api/auth/logout',
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

                    } else if (operation === 'verify') {
                        const options = {
                            method: 'GET',
                            url: '/api/auth/verify',
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

                    } else if (operation === 'getCodes') {
                        const options = {
                            method: 'GET',
                            url: '/api/auth/codes',
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
