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

export class MiraLibraryCreate implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira Library Create',
        name: 'miraLibraryCreate',
        description: 'Create a new library in Mira App Server',
        defaults: {
            name: 'Mira Library Create',
        },
        properties: [
            {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                required: true,
                default: '',
                description: 'Library name',
            },
            {
                displayName: 'Path',
                name: 'path',
                type: 'string',
                required: true,
                default: '',
                description: 'Library path',
            },
            {
                displayName: 'Type',
                name: 'type',
                type: 'options',
                options: [
                    {
                        name: 'Local',
                        value: 'local',
                    },
                    {
                        name: 'Remote',
                        value: 'remote',
                    },
                ],
                default: 'local',
                description: 'Library type',
            },
            {
                displayName: 'Description',
                name: 'description',
                type: 'string',
                default: '',
                description: 'Library description',
            },
            {
                displayName: 'Icon',
                name: 'icon',
                type: 'string',
                default: '',
                description: 'Library icon',
            },
            {
                displayName: 'Enable Hash',
                name: 'enableHash',
                type: 'boolean',
                default: false,
                description: 'Enable hash calculation for files',
            },
            {
                displayName: 'Server URL',
                name: 'serverURL',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        type: ['remote'],
                    },
                },
                description: 'Server URL for remote library',
            },
            {
                displayName: 'Server Port',
                name: 'serverPort',
                type: 'number',
                default: 8080,
                displayOptions: {
                    show: {
                        type: ['remote'],
                    },
                },
                description: 'Server port for remote library',
            },
            {
                displayName: 'Plugins Directory',
                name: 'pluginsDir',
                type: 'string',
                default: '',
                description: 'Directory for plugins (optional)',
            },
        ] as INodeProperties[],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return processMiraItems.call(this, async (i: number) => {
            const name = this.getNodeParameter('name', i) as string;
            const path = this.getNodeParameter('path', i) as string;
            const type = this.getNodeParameter('type', i) as string;
            const description = this.getNodeParameter('description', i) as string;
            const icon = this.getNodeParameter('icon', i) as string;
            const enableHash = this.getNodeParameter('enableHash', i) as boolean;
            const serverURL = this.getNodeParameter('serverURL', i) as string;
            const serverPort = this.getNodeParameter('serverPort', i) as number;
            const pluginsDir = this.getNodeParameter('pluginsDir', i) as string;

            if (!name) {
                throw new NodeOperationError(this.getNode(), 'Library name is required', {
                    itemIndex: i,
                });
            }

            if (!path) {
                throw new NodeOperationError(this.getNode(), 'Library path is required', {
                    itemIndex: i,
                });
            }

            const body: any = {
                name,
                path,
                type,
                description,
                customFields: {
                    enableHash,
                },
            };

            if (icon) body.icon = icon;
            if (type === 'remote') {
                body.serverURL = serverURL;
                body.serverPort = serverPort;
            }
            if (pluginsDir) body.pluginsDir = pluginsDir;

            const options = {
                method: 'POST' as const,
                url: '/api/libraries',
                body,
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                created: true,
                library: {
                    name,
                    path,
                    type,
                    description,
                    icon,
                    enableHash,
                    ...(type === 'remote' && { serverURL, serverPort }),
                    ...(pluginsDir && { pluginsDir }),
                },
                response,
                timestamp: new Date().toISOString(),
                operation: 'create',
            };
        });
    }
}
