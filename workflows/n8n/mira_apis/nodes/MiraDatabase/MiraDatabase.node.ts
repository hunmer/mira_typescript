import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';

export class MiraDatabase implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Database',
        name: 'miraDatabase',
        icon: 'file:mira.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Manage database with Mira App Server',
        defaults: {
            name: 'Mira Database',
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
                        name: 'Database',
                        value: 'database',
                    },
                ],
                default: 'database',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['database'],
                    },
                },
                options: [
                    {
                        name: 'List Tables',
                        value: 'listTables',
                        description: 'Get all database tables',
                        action: 'Get all database tables',
                    },
                    {
                        name: 'Get Table Data',
                        value: 'getTableData',
                        description: 'Get data from a table',
                        action: 'Get data from a table',
                    },
                    {
                        name: 'Get Table Schema',
                        value: 'getTableSchema',
                        description: 'Get table structure',
                        action: 'Get table structure',
                    },
                ],
                default: 'listTables',
            },
            {
                displayName: 'Table Name',
                name: 'tableName',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        operation: ['getTableData', 'getTableSchema'],
                    },
                },
                description: 'Name of the database table',
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
                if (resource === 'database') {
                    if (operation === 'listTables') {
                        const options = {
                            method: 'GET',
                            url: '/api/database/tables',
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

                    } else if (operation === 'getTableData') {
                        const tableName = this.getNodeParameter('tableName', i) as string;

                        const options = {
                            method: 'GET',
                            url: `/api/database/tables/${tableName}/data`,
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

                    } else if (operation === 'getTableSchema') {
                        const tableName = this.getNodeParameter('tableName', i) as string;

                        const options = {
                            method: 'GET',
                            url: `/api/database/tables/${tableName}/schema`,
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
