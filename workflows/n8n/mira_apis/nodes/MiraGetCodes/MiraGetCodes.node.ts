import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';
import { miraTokenProperties, miraTokenCredentials, miraCommonNodeConfig } from '../../shared/mira-common-properties';
import { processMiraItems } from '../../shared/mira-http-helper';
import { MiraHttpOptions } from '../../shared/mira-auth-helper';

export class MiraGetCodes implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Get Permission Codes',
        name: 'miraGetCodesNode',
        ...miraCommonNodeConfig,
        group: ['mira-auth'],
        description: 'Get permission codes for current user from Mira App Server',
        defaults: {
            name: 'Mira Get Permission Codes',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: miraTokenCredentials,
        properties: [
            ...miraTokenProperties.map(prop =>
                prop.name === 'tokenSource'
                    ? { ...prop, default: 'input' }  // Override default to 'input'
                    : prop
            ),
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return await processMiraItems(
            this,
            async (itemIndex: number): Promise<MiraHttpOptions> => {
                return {
                    method: 'GET',
                    endpoint: '/api/auth/codes',
                };
            },
            (response: any) => {
                return response || { message: 'No permission codes available' };
            }
        );
    }
}
