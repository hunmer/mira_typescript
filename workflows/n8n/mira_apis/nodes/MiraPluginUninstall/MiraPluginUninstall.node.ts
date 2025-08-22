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

export class MiraPluginUninstall implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira Plugin Uninstall',
        name: 'miraPluginUninstall',
        description: 'Uninstall a plugin from Mira App Server',
        defaults: {
            name: 'Mira Plugin Uninstall',
        },
        properties: [
            {
                displayName: '⚠️ Warning: This action will permanently uninstall the plugin and remove all its data!',
                name: 'uninstallWarning',
                type: 'notice',
                default: '',
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
        return processMiraItems.call(this, async (i: number) => {
            const pluginId = this.getNodeParameter('pluginId', i) as string;

            if (!pluginId) {
                throw new NodeOperationError(this.getNode(), 'Plugin ID is required', {
                    itemIndex: i,
                });
            }

            const options = {
                method: 'DELETE' as const,
                url: `/api/plugins/${pluginId}`,
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                uninstalled: true,
                pluginId,
                response,
                timestamp: new Date().toISOString(),
                operation: 'uninstall',
            };
        });
    }
}
