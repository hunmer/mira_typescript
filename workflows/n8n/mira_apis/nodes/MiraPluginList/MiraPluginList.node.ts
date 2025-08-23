import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';

import { miraCommonNodeConfig, miraTokenProperties, miraTokenCredentials } from '../../shared/mira-common-properties';
import { processMiraItems } from '../../shared/mira-http-helper';
import { MiraHttpOptions } from '../../shared/mira-auth-helper';

export class MiraPluginList implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Plugin List',
        name: 'miraPluginList',
        ...miraCommonNodeConfig,
        group: ['mira-plugin'],
        description: 'Get all plugins from Mira App Server',
        defaults: {
            name: 'Mira Plugin List',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: miraTokenCredentials,
        properties: [
            ...miraTokenProperties,
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return await processMiraItems(
            this,
            async (itemIndex: number): Promise<MiraHttpOptions> => {
                return {
                    method: 'GET',
                    endpoint: '/api/plugins',
                };
            },
            (response: any) => {
                return {
                    plugins: response,
                    count: Array.isArray(response) ? response.length : 0,
                    timestamp: new Date().toISOString(),
                    operation: 'list',
                };
            }
        );
    }
}
