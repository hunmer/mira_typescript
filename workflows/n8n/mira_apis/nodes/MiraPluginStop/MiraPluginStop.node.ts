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

export class MiraPluginStop implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira Plugin Stop',
        name: 'miraPluginStop',
        description: 'Stop a plugin in Mira App Server',
        defaults: {
            name: 'Mira Plugin Stop',
        },
        properties: [
            {
                displayName: 'Plugin ID',
                name: 'pluginId',
                type: 'string',
                required: true,
                default: '',
                description: 'The ID of the plugin to stop',
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
                url: `/api/plugins/${pluginId}/stop`,
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                stopped: true,
                pluginId,
                response,
                timestamp: new Date().toISOString(),
                operation: 'stop',
            };
        });
    }
}
