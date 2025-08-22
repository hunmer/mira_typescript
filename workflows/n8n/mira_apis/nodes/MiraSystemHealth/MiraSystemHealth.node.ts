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

export class MiraSystemHealth implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira System Health',
        name: 'miraSystemHealth',
        description: 'Get detailed system health status from Mira App Server',
        defaults: {
            name: 'Mira System Health',
        },
        properties: [],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return processMiraItems.call(this, async (i: number) => {
            const options = {
                method: 'GET' as const,
                url: '/api/health',
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                healthStatus: response,
                checkType: 'detailed',
                timestamp: new Date().toISOString(),
                operation: 'healthCheck',
            };
        });
    }
}
