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

export class MiraPluginStart implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira Plugin Start',
        name: 'miraPluginStart',
        description: 'Start a plugin in Mira App Server',
        defaults: {
            name: 'Mira Plugin Start',
        },
        properties: [
            {
                displayName: 'Plugin ID',
                name: 'pluginId',
                type: 'string',
                required: true,
                default: '',
                description: 'The ID of the plugin to start',
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
                method: 'POST' as const,
                url: `/api/plugins/${pluginId}/start`,
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                started: true,
                pluginId,
                response,
                timestamp: new Date().toISOString(),
                operation: 'start',
            };
        });
    }
}
