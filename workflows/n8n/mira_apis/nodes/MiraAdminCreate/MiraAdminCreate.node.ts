import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';

export class MiraAdminCreate implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Admin Create',
        name: 'miraAdminCreate',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        description: 'Create a new administrator in Mira App Server',
        defaults: {
            name: 'Mira Admin Create',
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
                displayName: 'Username',
                name: 'username',
                type: 'string',
                required: true,
                default: '',
                description: 'Administrator username',
            },
            {
                displayName: 'Email',
                name: 'email',
                type: 'string',
                required: true,
                default: '',
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
                description: 'Administrator password',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
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
                    'MiraApiCredential',
                    options,
                );
                returnData.push({
                    json: response,
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
