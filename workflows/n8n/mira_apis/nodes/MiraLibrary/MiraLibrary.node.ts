import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';

export class MiraLibrary implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Library',
        name: 'miraLibrary',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Manage libraries with Mira App Server',
        defaults: {
            name: 'Mira Library',
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
                        name: 'Library',
                        value: 'library',
                    },
                ],
                default: 'library',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['library'],
                    },
                },
                options: [
                    {
                        name: 'List',
                        value: 'list',
                        description: 'Get all libraries',
                        action: 'Get all libraries',
                    },
                    {
                        name: 'Create',
                        value: 'create',
                        description: 'Create a new library',
                        action: 'Create a new library',
                    },
                    {
                        name: 'Update',
                        value: 'update',
                        description: 'Update a library',
                        action: 'Update a library',
                    },
                    {
                        name: 'Delete',
                        value: 'delete',
                        description: 'Delete a library',
                        action: 'Delete a library',
                    },
                    {
                        name: 'Start',
                        value: 'start',
                        description: 'Start a library service',
                        action: 'Start a library service',
                    },
                    {
                        name: 'Stop',
                        value: 'stop',
                        description: 'Stop a library service',
                        action: 'Stop a library service',
                    },
                ],
                default: 'list',
            },
            // Common field for operations that need library ID
            {
                displayName: 'Library ID',
                name: 'libraryId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['update', 'delete', 'start', 'stop'],
                    },
                },
                description: 'The ID of the library',
            },
            // Create library fields
            {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['create', 'update'],
                    },
                },
                description: 'Library name',
            },
            {
                displayName: 'Path',
                name: 'path',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
                description: 'Library path',
            },
            {
                displayName: 'Type',
                name: 'type',
                type: 'options',
                options: [
                    {
                        name: 'Local',
                        value: 'local',
                    },
                    {
                        name: 'Remote',
                        value: 'remote',
                    },
                ],
                default: 'local',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
                description: 'Library type',
            },
            {
                displayName: 'Description',
                name: 'description',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['create', 'update'],
                    },
                },
                description: 'Library description',
            },
            {
                displayName: 'Icon',
                name: 'icon',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
                description: 'Library icon',
            },
            {
                displayName: 'Enable Hash',
                name: 'enableHash',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['create', 'update'],
                    },
                },
                description: 'Enable hash calculation for files',
            },
            {
                displayName: 'Server URL',
                name: 'serverURL',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['create'],
                        type: ['remote'],
                    },
                },
                description: 'Server URL for remote library',
            },
            {
                displayName: 'Server Port',
                name: 'serverPort',
                type: 'number',
                default: 8080,
                displayOptions: {
                    show: {
                        operation: ['create'],
                        type: ['remote'],
                    },
                },
                description: 'Server port for remote library',
            },
            {
                displayName: 'Plugins Directory',
                name: 'pluginsDir',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
                description: 'Directory for plugins (optional)',
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
                if (resource === 'library') {
                    if (operation === 'list') {
                        const options = {
                            method: 'GET',
                            url: '/api/libraries',
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

                    } else if (operation === 'create') {
                        const name = this.getNodeParameter('name', i) as string;
                        const path = this.getNodeParameter('path', i) as string;
                        const type = this.getNodeParameter('type', i) as string;
                        const description = this.getNodeParameter('description', i) as string;
                        const icon = this.getNodeParameter('icon', i) as string;
                        const enableHash = this.getNodeParameter('enableHash', i) as boolean;
                        const serverURL = this.getNodeParameter('serverURL', i) as string;
                        const serverPort = this.getNodeParameter('serverPort', i) as number;
                        const pluginsDir = this.getNodeParameter('pluginsDir', i) as string;

                        const body: any = {
                            name,
                            path,
                            type,
                            description,
                            customFields: {
                                enableHash,
                            },
                        };

                        if (icon) body.icon = icon;
                        if (type === 'remote') {
                            body.serverURL = serverURL;
                            body.serverPort = serverPort;
                        }
                        if (pluginsDir) body.pluginsDir = pluginsDir;

                        const options = {
                            method: 'POST',
                            url: '/api/libraries',
                            body,
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

                    } else if (operation === 'update') {
                        const libraryId = this.getNodeParameter('libraryId', i) as string;
                        const name = this.getNodeParameter('name', i) as string;
                        const description = this.getNodeParameter('description', i) as string;
                        const enableHash = this.getNodeParameter('enableHash', i) as boolean;

                        const body: any = {
                            customFields: {
                                enableHash,
                            },
                        };

                        if (name) body.name = name;
                        if (description) body.description = description;

                        const options = {
                            method: 'PUT',
                            url: `/api/libraries/${libraryId}`,
                            body,
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

                    } else if (operation === 'delete') {
                        const libraryId = this.getNodeParameter('libraryId', i) as string;

                        const options = {
                            method: 'DELETE',
                            url: `/api/libraries/${libraryId}`,
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

                    } else if (operation === 'start') {
                        const libraryId = this.getNodeParameter('libraryId', i) as string;

                        const options = {
                            method: 'POST',
                            url: `/api/libraries/${libraryId}/start`,
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

                    } else if (operation === 'stop') {
                        const libraryId = this.getNodeParameter('libraryId', i) as string;

                        const options = {
                            method: 'POST',
                            url: `/api/libraries/${libraryId}/stop`,
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
