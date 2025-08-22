import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';

export class MiraAdmin implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Admin',
        name: 'miraAdmin',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Manage administrators with Mira App Server',
        defaults: {
            name: 'Mira Admin',
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
                        name: 'Admin',
                        value: 'admin',
                    },
                ],
                default: 'admin',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['admin'],
                    },
                },
                options: [
                    {
                        name: 'List',
                        value: 'list',
                        description: 'Get all administrators',
                        action: 'Get all administrators',
                    },
                    {
                        name: 'Create',
                        value: 'create',
                        description: 'Create a new administrator',
                        action: 'Create a new administrator',
                    },
                ],
                default: 'list',
            },
            // Create admin fields
            {
                displayName: 'Username',
                name: 'username',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
                description: 'Administrator username',
            },
            {
                displayName: 'Email',
                name: 'email',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
                description: 'Administrator email',
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
                        operation: ['create'],
                    },
                },
                description: 'Administrator password',
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
                if (resource === 'admin') {
                    if (operation === 'list') {
                        const options = {
                            method: 'GET',
                            url: '/api/admins',
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

                    } else if (operation === 'create') {
                        const username = this.getNodeParameter('username', i) as string;
                        const email = this.getNodeParameter('email', i) as string;
                        const password = this.getNodeParameter('password', i) as string;

                        const options = {
                            method: 'POST',
                            url: '/api/admins',
                            body: {
                                username,
                                email,
                                password,
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
