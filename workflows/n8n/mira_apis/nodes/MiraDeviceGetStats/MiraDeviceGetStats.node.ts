import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';
import { miraCommonNodeConfig, miraTokenProperties, miraTokenCredentials } from '../../shared/mira-common-properties';
import { processMiraItems } from '../../shared/mira-http-helper';
import { MiraHttpOptions } from '../../shared/mira-auth-helper';

export class MiraDeviceGetStats implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Device Get Stats',
        name: 'miraDeviceGetStats',
        ...miraCommonNodeConfig,
        group: ['mira-device'],
        description: 'Get device statistics from Mira App Server',
        defaults: {
            name: 'Mira Device Get Stats',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: miraTokenCredentials,
        properties: [
            ...miraTokenProperties,
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return await processMiraItems(
            this,
            async (itemIndex: number): Promise<MiraHttpOptions> => {
                return {
                    method: 'GET',
                    endpoint: '/api/devices/stats',
                };
            },
            (response: any) => {
                return {
                    ...response,
                    operation: 'get_stats',
                    timestamp: new Date().toISOString(),
                };
            }
        );
    }
}
