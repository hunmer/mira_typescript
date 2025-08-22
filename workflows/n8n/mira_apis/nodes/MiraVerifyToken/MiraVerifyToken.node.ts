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

export class MiraVerifyToken implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Verify Token',
        name: 'miraVerifyToken',
        ...miraCommonNodeConfig,
        group: ['mira-auth'],
        description: 'Verify access token with Mira App Server',
        defaults: {
            name: 'Mira Verify Token',
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
                    endpoint: '/api/auth/verify',
                };
            }
        );
    }
}
