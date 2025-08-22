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

export class MiraPluginInstall implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira Plugin Install',
        name: 'miraPluginInstall',
        description: 'Install a plugin in Mira App Server',
        defaults: {
            name: 'Mira Plugin Install',
        },
        properties: [
            {
                displayName: 'Plugin Path',
                name: 'pluginPath',
                type: 'string',
                required: true,
                default: '',
                description: 'Path to the plugin to install (local file path or URL)',
                placeholder: '/path/to/plugin or https://example.com/plugin.zip',
            },
        ] as INodeProperties[],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return processMiraItems.call(this, async (i: number) => {
            const pluginPath = this.getNodeParameter('pluginPath', i) as string;

            if (!pluginPath) {
                throw new NodeOperationError(this.getNode(), 'Plugin path is required', {
                    itemIndex: i,
                });
            }

            const options = {
                method: 'POST' as const,
                url: '/api/plugins/install',
                body: {
                    pluginPath,
                },
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                installed: true,
                pluginPath,
                response,
                timestamp: new Date().toISOString(),
                operation: 'install',
            };
        });
    }
}
