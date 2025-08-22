import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';

export class MiraPlugin implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Plugin',
        name: 'miraPlugin',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Manage plugins with Mira App Server',
        defaults: {
            name: 'Mira Plugin',
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
                        name: 'Plugin',
                        value: 'plugin',
                    },
                ],
                default: 'plugin',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['plugin'],
                    },
                },
                options: [
                    {
                        name: 'List',
                        value: 'list',
                        description: 'Get all plugins',
                        action: 'Get all plugins',
                    },
                    {
                        name: 'Get Info',
                        value: 'getInfo',
                        description: 'Get plugin information',
                        action: 'Get plugin information',
                    },
                    {
                        name: 'Start',
                        value: 'start',
                        description: 'Start a plugin',
                        action: 'Start a plugin',
                    },
                    {
                        name: 'Stop',
                        value: 'stop',
                        description: 'Stop a plugin',
                        action: 'Stop a plugin',
                    },
                    {
                        name: 'Install',
                        value: 'install',
                        description: 'Install a plugin',
                        action: 'Install a plugin',
                    },
                    {
                        name: 'Uninstall',
                        value: 'uninstall',
                        description: 'Uninstall a plugin',
                        action: 'Uninstall a plugin',
                    },
                ],
                default: 'list',
            },
            {
                displayName: 'Plugin ID',
                name: 'pluginId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['getInfo', 'start', 'stop', 'uninstall'],
                    },
                },
                description: 'The ID of the plugin',
            },
            {
                displayName: 'Plugin Path',
                name: 'pluginPath',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['install'],
                    },
                },
                description: 'Path to the plugin to install',
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
                if (resource === 'plugin') {
                    if (operation === 'list') {
                        const options = {
                            method: 'GET',
                            url: '/api/plugins',
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

                    } else if (operation === 'getInfo') {
                        const pluginId = this.getNodeParameter('pluginId', i) as string;

                        const options = {
                            method: 'GET',
                            url: `/api/plugins/${pluginId}`,
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

                    } else if (operation === 'start') {
                        const pluginId = this.getNodeParameter('pluginId', i) as string;

                        const options = {
                            method: 'POST',
                            url: `/api/plugins/${pluginId}/start`,
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

                    } else if (operation === 'stop') {
                        const pluginId = this.getNodeParameter('pluginId', i) as string;

                        const options = {
                            method: 'POST',
                            url: `/api/plugins/${pluginId}/stop`,
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

                    } else if (operation === 'install') {
                        const pluginPath = this.getNodeParameter('pluginPath', i) as string;

                        const options = {
                            method: 'POST',
                            url: '/api/plugins/install',
                            body: {
                                pluginPath,
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

                    } else if (operation === 'uninstall') {
                        const pluginId = this.getNodeParameter('pluginId', i) as string;

                        const options = {
                            method: 'DELETE',
                            url: `/api/plugins/${pluginId}`,
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
