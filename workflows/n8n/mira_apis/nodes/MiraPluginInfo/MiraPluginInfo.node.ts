import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
    INodeProperties,
} from 'n8n-workflow';

import { miraCommonNodeConfig } from '../../shared/mira-common-properties';
import { processMiraItems } from '../../shared/mira-http-helper';

export class MiraPluginInfo implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira Plugin Info',
        name: 'miraPluginInfo',
        description: 'Get plugin information from Mira App Server',
        defaults: {
            name: 'Mira Plugin Info',
        },
        properties: [
            {
                displayName: 'Plugin ID',
                name: 'pluginId',
                type: 'string',
                required: true,
                default: '',
                description: 'The ID of the plugin to get information for',
            },
        ] as INodeProperties[],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return processMiraItems.call(this, async (i: number) => {
            const pluginId = this.getNodeParameter('pluginId', i) as string;

            if (!pluginId) {
                throw new NodeOperationError(this.getNode(), 'Plugin ID is required', {
                    itemIndex: i,
                });
            }

            const options = {
                method: 'GET' as const,
                url: `/api/plugins/${pluginId}`,
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                pluginId,
                pluginInfo: response,
                timestamp: new Date().toISOString(),
                operation: 'getInfo',
            };
        });
    }
}
