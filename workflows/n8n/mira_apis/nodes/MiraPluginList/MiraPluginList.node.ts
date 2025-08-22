import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';

import { miraCommonNodeConfig } from '../../shared/mira-common-properties';
import { processMiraItems } from '../../shared/mira-http-helper';

export class MiraPluginList implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira Plugin List',
        name: 'miraPluginList',
        description: 'Get all plugins from Mira App Server',
        defaults: {
            name: 'Mira Plugin List',
        },
        properties: [],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return processMiraItems.call(this, async (i: number) => {
            const options = {
                method: 'GET' as const,
                url: '/api/plugins',
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                plugins: response,
                count: Array.isArray(response) ? response.length : 0,
                timestamp: new Date().toISOString(),
                operation: 'list',
            };
        });
    }
}
