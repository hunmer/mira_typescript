import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';
import { miraCommonNodeConfig } from '../../shared/mira-common-properties';

export class MiraDatabaseGetSchema implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Database Get Schema',
        name: 'miraDatabaseGetSchema',
        ...miraCommonNodeConfig,
        group: ['database'],
        description: 'Get table structure/schema from Mira App Server database',
        defaults: {
            name: 'Mira Database Get Schema',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'MiraApiCredential',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Table Name',
                name: 'tableName',
                type: 'string',
                required: true,
                default: '',
                description: 'Name of the database table to get schema from',
                placeholder: 'users',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const tableName = this.getNodeParameter('tableName', i) as string;

                // Validate required parameter
                if (!tableName || tableName.trim() === '') {
                    throw new Error('Table name is required and cannot be empty');
                }

                const options = {
                    method: 'GET' as const,
                    url: `/api/database/tables/${tableName.trim()}/schema`,
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
                throw error;
            }
        }

        return [returnData];
    }
}
