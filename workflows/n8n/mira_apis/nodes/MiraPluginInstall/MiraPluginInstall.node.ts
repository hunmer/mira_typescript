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

export class MiraPluginInstall implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Plugin Install',
        name: 'miraPluginInstall',
        ...miraCommonNodeConfig,
        group: ['mira-plugin'],
        description: 'Install a plugin in Mira App Server',
        defaults: {
            name: 'Mira Plugin Install',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: miraTokenCredentials,
        properties: [
            ...miraTokenProperties,
            {
                displayName: 'Library ID',
                name: 'libraryId',
                type: 'string',
                required: true,
                default: '',
                description: 'The Library ID where the plugin will be installed',
                placeholder: '1755239013113',
            },
            {
                displayName: 'Installation Method',
                name: 'installMethod',
                type: 'options',
                options: [
                    {
                        name: 'NPM Package',
                        value: 'npm',
                        description: 'Install from NPM registry',
                    },
                    {
                        name: 'File Path/URL',
                        value: 'path',
                        description: 'Install from local file path or URL (Note: This uses the NPM install with the path as package name)',
                    },
                ],
                default: 'npm',
                required: true,
                description: 'Choose how to install the plugin',
            },
            {
                displayName: 'NPM Package Name',
                name: 'packageName',
                type: 'string',
                required: true,
                default: '',
                description: 'Name of the NPM package to install',
                placeholder: 'my-plugin',
                displayOptions: {
                    show: {
                        installMethod: ['npm'],
                    },
                },
            },
            {
                displayName: 'Version',
                name: 'version',
                type: 'string',
                required: false,
                default: 'latest',
                description: 'Version of the NPM package to install',
                placeholder: 'latest or 1.0.0',
                displayOptions: {
                    show: {
                        installMethod: ['npm'],
                    },
                },
            },
            {
                displayName: 'Plugin Path or URL',
                name: 'pluginPath',
                type: 'string',
                required: true,
                default: '',
                description: 'Path to the plugin to install (local file path, git URL, or tarball URL). Examples: /path/to/plugin, https://github.com/user/plugin.git, https://example.com/plugin.tar.gz',
                placeholder: '/path/to/plugin or git+https://github.com/user/plugin.git',
                displayOptions: {
                    show: {
                        installMethod: ['path'],
                    },
                },
            },
        ] as INodeProperties[],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return await processMiraItems(
            this,
            async (itemIndex: number): Promise<MiraHttpOptions> => {
                const installMethod = this.getNodeParameter('installMethod', itemIndex) as string;
                const libraryId = this.getNodeParameter('libraryId', itemIndex) as string;

                if (!libraryId) {
                    throw new NodeOperationError(this.getNode(), 'Library ID is required', {
                        itemIndex,
                    });
                }

                if (installMethod === 'npm') {
                    // NPM 安装方式
                    const packageName = this.getNodeParameter('packageName', itemIndex) as string;
                    const version = this.getNodeParameter('version', itemIndex) as string || 'latest';

                    if (!packageName) {
                        throw new NodeOperationError(this.getNode(), 'NPM package name is required', {
                            itemIndex,
                        });
                    }

                    return {
                        method: 'POST',
                        endpoint: '/api/plugins/install',
                        body: {
                            name: packageName,
                            version: version,
                            libraryId: libraryId,
                        },
                    };
                } else {
                    // 文件路径安装方式
                    const pluginPath = this.getNodeParameter('pluginPath', itemIndex) as string;

                    if (!pluginPath) {
                        throw new NodeOperationError(this.getNode(), 'Plugin path is required', {
                            itemIndex,
                        });
                    }

                    // 对于文件路径方式，仍使用原来的 pluginPath 参数
                    // 注意：后端可能需要添加对 pluginPath 的支持，或者使用上传接口
                    return {
                        method: 'POST',
                        endpoint: '/api/plugins/install',
                        body: {
                            name: pluginPath, // 临时使用 name 字段传递路径
                            libraryId: libraryId,
                        },
                    };
                }
            },
            (response: any, itemIndex: number) => {
                const installMethod = this.getNodeParameter('installMethod', itemIndex) as string;
                const libraryId = this.getNodeParameter('libraryId', itemIndex) as string;

                let installInfo: any = {
                    installed: true,
                    libraryId,
                    installMethod,
                    response,
                    timestamp: new Date().toISOString(),
                    operation: 'install',
                };

                if (installMethod === 'npm') {
                    const packageName = this.getNodeParameter('packageName', itemIndex) as string;
                    const version = this.getNodeParameter('version', itemIndex) as string;
                    installInfo.packageName = packageName;
                    installInfo.version = version;
                } else {
                    const pluginPath = this.getNodeParameter('pluginPath', itemIndex) as string;
                    installInfo.pluginPath = pluginPath;
                }

                return installInfo;
            }
        );
    }
}
