import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';

export class MiraUser implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira User',
        name: 'miraUser',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Manage users with Mira App Server',
        defaults: {
            name: 'Mira User',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'MiraApiCredential',
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
                        name: 'User',
                        value: 'user',
                    },
                ],
                default: 'user',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['user'],
                    },
                },
                options: [
                    {
                        name: 'Get Info',
                        value: 'getInfo',
                        description: 'Get current user information',
                        action: 'Get current user information',
                    },
                    {
                        name: 'Update Info',
                        value: 'updateInfo',
                        description: 'Update current user information',
                        action: 'Update current user information',
                    },
                ],
                default: 'getInfo',
            },
            // Update user info fields
            {
                displayName: 'Real Name',
                name: 'realName',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['updateInfo'],
                    },
                },
                description: 'User real name',
            },
            {
                displayName: 'Avatar',
                name: 'avatar',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['updateInfo'],
                    },
                },
                description: 'User avatar URL',
            },
            {
                displayName: 'Description',
                name: 'desc',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['updateInfo'],
                    },
                },
                description: 'User description',
            },
            {
                displayName: 'Password',
                name: 'password',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                displayOptions: {
                    show: {
                        operation: ['updateInfo'],
                    },
                },
                description: 'New password (optional)',
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
                if (resource === 'user') {
                    if (operation === 'getInfo') {
                        const options = {
                            method: 'GET',
                            url: '/api/user/info',
                        };

                        const response = await this.helpers.httpRequestWithAuthentication.call(
                            this,
                            'MiraApiCredential',
                            options,
                        );
                        returnData.push({
                            json: response,
                            pairedItem: { item: i },
                        });

                    } else if (operation === 'updateInfo') {
                        const updateData: any = {};

                        const realName = this.getNodeParameter('realName', i) as string;
                        const avatar = this.getNodeParameter('avatar', i) as string;
                        const desc = this.getNodeParameter('desc', i) as string;
                        const password = this.getNodeParameter('password', i) as string;

                        if (realName) updateData.realName = realName;
                        if (avatar) updateData.avatar = avatar;
                        if (desc) updateData.desc = desc;
                        if (password) updateData.password = password;

                        const options = {
                            method: 'PUT',
                            url: '/api/user/info',
                            body: updateData,
                        };

                        const response = await this.helpers.httpRequestWithAuthentication.call(
                            this,
                            'MiraApiCredential',
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
