import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';

import { miraCommonNodeConfig } from '../../shared/mira-common-properties';
import { processMiraItems } from '../../shared/mira-http-helper';

export class MiraUserInfo implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira User Info',
        name: 'miraUserInfo',
        description: 'Get current user information from Mira App Server',
        defaults: {
            name: 'Mira User Info',
        },
        properties: [],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return processMiraItems.call(this, async (i: number) => {
            const options = {
                method: 'GET' as const,
                url: '/api/user/info',
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                userInfo: response,
                timestamp: new Date().toISOString(),
                operation: 'getInfo',
            };
        });
    }
}
