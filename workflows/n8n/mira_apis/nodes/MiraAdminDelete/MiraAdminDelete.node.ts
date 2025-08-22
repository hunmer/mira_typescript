import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class MiraAdminDelete implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Admin Delete',
        name: 'miraAdminDelete',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        description: 'Delete administrator from Mira App Server (soft delete)',
        defaults: {
            name: 'Mira Admin Delete',
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
                description: 'ID of the administrator to delete. Can use expressions like {{ $json.id }}',
                placeholder: '{{ $json.id }}',
            },
            {
                displayName: '⚠️ Warning: This will soft delete the administrator account',
                name: 'confirmation',
                type: 'notice',
                default: '',
                typeOptions: {
                    theme: 'warning',
                },
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
                let serverUrl: string;

                // 验证 adminId 不为空
                if (!adminId || adminId.trim() === '') {
                    throw new NodeOperationError(
                        this.getNode(),
                        'Admin ID is required and cannot be empty',
                        { itemIndex: i }
                    );
                }

                if (tokenSource === 'credentials') {
                    // Get server URL from credentials and use credential authentication
                    const credentials = await this.getCredentials('MiraApiCredential');
                    serverUrl = credentials.serverUrl as string;

                    const options = {
                        method: 'DELETE' as IHttpRequestMethods,
                        url: `${serverUrl}/api/admins/${adminId}`,
                    };

                    const response = await this.helpers.httpRequestWithAuthentication.call(
                        this,
                        'MiraApiCredential',
                        options,
                    );

                    // 增强返回数据，包含删除的信息
                    const enhancedResponse = {
                        ...response,
                        deletedAdminId: adminId,
                        operation: 'soft_delete',
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
                        method: 'DELETE' as IHttpRequestMethods,
                        url: `${serverUrl}/api/admins/${adminId}`,
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                    };

                    const response = await this.helpers.httpRequest(options);

                    // 增强返回数据，包含删除的信息
                    const enhancedResponse = {
                        ...response,
                        deletedAdminId: adminId,
                        operation: 'soft_delete',
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
