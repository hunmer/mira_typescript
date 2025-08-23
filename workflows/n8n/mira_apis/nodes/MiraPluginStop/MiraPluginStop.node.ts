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

export class MiraPluginStop implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Plugin Stop',
        name: 'miraPluginStop',
        ...miraCommonNodeConfig,
        group: ['mira-plugin'],
        description: 'Stop a plugin in Mira App Server',
        defaults: {
            name: 'Mira Plugin Stop',
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
                description: 'The ID of the plugin to stop',
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
                    method: 'POST',
                    endpoint: `/api/plugins/${pluginId}/stop`,
                };
            },
            (response: any, itemIndex: number) => {
                const pluginId = this.getNodeParameter('pluginId', itemIndex) as string;
                return {
                    stopped: true,
                    pluginId,
                    response,
                    timestamp: new Date().toISOString(),
                    operation: 'stop',
                };
            }
        );
    }
}
