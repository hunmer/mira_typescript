import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class MiraAdminUpdate implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Admin Update',
        name: 'miraAdminUpdate',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        description: 'Update administrator information in Mira App Server',
        defaults: {
            name: 'Mira Admin Update',
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
                default: 'credentials',
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
            {
                displayName: 'Admin ID',
                name: 'adminId',
                type: 'string',
                required: true,
                default: '',
                description: 'ID of the administrator to update. Can use expressions like {{ $json.id }}',
                placeholder: '{{ $json.id }}',
            },
            {
                displayName: 'Update Fields',
                name: 'updateFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                options: [
                    {
                        displayName: 'Username',
                        name: 'username',
                        type: 'string',
                        default: '',
                        description: 'New username for the administrator',
                    },
                    {
                        displayName: 'Email',
                        name: 'email',
                        type: 'string',
                        default: '',
                        description: 'New email for the administrator',
                    },
                    {
                        displayName: 'Password',
                        name: 'password',
                        type: 'string',
                        typeOptions: {
                            password: true,
                        },
                        default: '',
                        description: 'New password for the administrator (leave empty to keep current password)',
                    },
                ],
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const tokenSource = this.getNodeParameter('tokenSource', i) as string;
                const adminId = this.getNodeParameter('adminId', i) as string;
                const updateFields = this.getNodeParameter('updateFields', i) as any;
                let serverUrl: string;

                // 验证 adminId 不为空
                if (!adminId || adminId.trim() === '') {
                    throw new NodeOperationError(
                        this.getNode(),
                        'Admin ID is required and cannot be empty',
                        { itemIndex: i }
                    );
                }

                // 构建请求体，只包含非空字段
                const requestBody: any = {};
                if (updateFields.username && updateFields.username.trim() !== '') {
                    requestBody.username = updateFields.username.trim();
                }
                if (updateFields.email && updateFields.email.trim() !== '') {
                    requestBody.email = updateFields.email.trim();
                }
                if (updateFields.password && updateFields.password.trim() !== '') {
                    requestBody.password = updateFields.password.trim();
                }

                // 如果没有要更新的字段，返回错误
                if (Object.keys(requestBody).length === 0) {
                    throw new NodeOperationError(
                        this.getNode(),
                        'At least one field must be provided for update',
                        { itemIndex: i }
                    );
                }

                if (tokenSource === 'credentials') {
                    // Get server URL from credentials and use credential authentication
                    const credentials = await this.getCredentials('MiraApiCredential');
                    serverUrl = credentials.serverUrl as string;

                    const options = {
                        method: 'PUT' as IHttpRequestMethods,
                        url: `${serverUrl}/api/admins/${adminId}`,
                        body: requestBody,
                    };

                    const response = await this.helpers.httpRequestWithAuthentication.call(
                        this,
                        'MiraApiCredential',
                        options,
                    );

                    // 增强返回数据，包含更新的信息
                    const enhancedResponse = {
                        ...response,
                        updatedAdminId: adminId,
                        updatedFields: requestBody,
                        timestamp: new Date().toISOString()
                    };

                    returnData.push({
                        json: enhancedResponse,
                        pairedItem: { item: i },
                    });
                } else {
                    // Get token from input parameter
                    const token = this.getNodeParameter('accessToken', i) as string;
                    serverUrl = this.getNodeParameter('serverUrl', i) as string;

                    const options = {
                        method: 'PUT' as IHttpRequestMethods,
                        url: `${serverUrl}/api/admins/${adminId}`,
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: requestBody,
                    };

                    const response = await this.helpers.httpRequest(options);

                    // 增强返回数据，包含更新的信息
                    const enhancedResponse = {
                        ...response,
                        updatedAdminId: adminId,
                        updatedFields: requestBody,
                        timestamp: new Date().toISOString()
                    };

                    returnData.push({
                        json: enhancedResponse,
                        pairedItem: { item: i },
                    });
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
