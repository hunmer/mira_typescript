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

export class MiraLogout implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Logout',
        name: 'miraLogout',
        ...miraCommonNodeConfig,
        group: ['mira-auth'],
        description: 'Logout from Mira App Server and revoke access token',
        defaults: {
            name: 'Mira Logout',
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
                    method: 'POST',
                    endpoint: '/api/auth/logout',
                };
            },
            (response: any) => {
                return response || { success: true, message: 'Logged out successfully' };
            }
        );
    }
}
