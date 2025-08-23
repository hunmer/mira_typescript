import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';
import { miraCommonNodeConfig } from '../../shared/mira-common-properties';

export class MiraLogin implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Login',
        name: 'miraLogin',
        ...miraCommonNodeConfig,
        group: ['mira-auth'],
        description: 'Login to Mira App Server to get access token',
        defaults: {
            name: 'Mira Login',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'MiraLoginCredential',
                required: true,
            },
        ],
        properties: [
            // No additional properties needed - all info comes from credentials
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                // Use credentials only - this is different from other nodes as it doesn't require token auth
                const credentials = await this.getCredentials('MiraLoginCredential');
                const serverUrl = credentials.serverUrl as string;
                const username = credentials.username as string;
                const password = credentials.password as string;

                const options = {
                    method: 'POST' as const,
                    url: `${serverUrl}/api/auth/login`,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username,
                        password,
                    }),
                };

                const response = await this.helpers.httpRequest(options);
                returnData.push({
                    json: response,
                    pairedItem: { item: i },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: (error as Error).message },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}
