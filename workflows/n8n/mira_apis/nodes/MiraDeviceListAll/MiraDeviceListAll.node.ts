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

export class MiraDeviceListAll implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Device List All',
        name: 'miraDeviceListAll',
        ...miraCommonNodeConfig,
        group: ['mira-device'],
        description: 'Get all device connections from Mira App Server',
        defaults: {
            name: 'Mira Device List All',
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
                    endpoint: '/api/devices',
                };
            },
            (response: any) => {
                return {
                    devices: response,
                    count: Array.isArray(response) ? response.length : 0,
                    timestamp: new Date().toISOString(),
                    operation: 'listAll',
                };
            }
        );
    }
}
