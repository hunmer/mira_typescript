import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
    INodeProperties,
} from 'n8n-workflow';

import { miraCommonNodeConfig, miraTokenProperties, miraTokenCredentials } from '../../shared/mira-common-properties';
import { processMiraItems } from '../../shared/mira-http-helper';
import { MiraHttpOptions } from '../../shared/mira-auth-helper';

export class MiraPluginInfo implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Plugin Info',
        name: 'miraPluginInfo',
        ...miraCommonNodeConfig,
        group: ['mira-plugin'],
        description: 'Get plugin information from Mira App Server',
        defaults: {
            name: 'Mira Plugin Info',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: miraTokenCredentials,
        properties: [
            ...miraTokenProperties,
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
        return await processMiraItems(
            this,
            async (itemIndex: number): Promise<MiraHttpOptions> => {
                const pluginId = this.getNodeParameter('pluginId', itemIndex) as string;

                if (!pluginId) {
                    throw new NodeOperationError(this.getNode(), 'Plugin ID is required', {
                        itemIndex,
                    });
                }

                return {
                    method: 'GET',
                    endpoint: `/api/plugins/${pluginId}`,
                };
            },
            (response: any, itemIndex: number) => {
                const pluginId = this.getNodeParameter('pluginId', itemIndex) as string;
                return {
                    pluginId,
                    pluginInfo: response,
                    timestamp: new Date().toISOString(),
                    operation: 'getInfo',
                };
            }
        );
    }
}
