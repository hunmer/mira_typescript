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

export class MiraPluginUninstall implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Plugin Uninstall',
        name: 'miraPluginUninstall',
        ...miraCommonNodeConfig,
        group: ['mira-plugin'],
        description: 'Uninstall a plugin from Mira App Server',
        defaults: {
            name: 'Mira Plugin Uninstall',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: miraTokenCredentials,
        properties: [
            ...miraTokenProperties,
            {
                displayName: '⚠️ Warning: This action will permanently uninstall the plugin and remove all its data!',
                name: 'uninstallWarning',
                type: 'notice',
                default: '',
                typeOptions: {
                    theme: 'warning',
                },
            },
            {
                displayName: 'Plugin ID',
                name: 'pluginId',
                type: 'string',
                required: true,
                default: '',
                description: 'The ID of the plugin to uninstall',
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
                    method: 'DELETE',
                    endpoint: `/api/plugins/${pluginId}`,
                };
            },
            (response: any, itemIndex: number) => {
                const pluginId = this.getNodeParameter('pluginId', itemIndex) as string;
                return {
                    uninstalled: true,
                    pluginId,
                    response,
                    timestamp: new Date().toISOString(),
                    operation: 'uninstall',
                };
            }
        );
    }
}
