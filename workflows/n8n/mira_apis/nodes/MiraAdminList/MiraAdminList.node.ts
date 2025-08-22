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

export class MiraAdminList implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Admin List',
        name: 'miraAdminList',
        ...miraCommonNodeConfig,
        description: 'Get all administrators from Mira App Server',
        defaults: {
            name: 'Mira Admin List',
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
                    endpoint: '/api/admins',
                };
            }
        );
    }
}
