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

export class MiraAdminCreate implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Admin Create',
        name: 'miraAdminCreate',
        ...miraCommonNodeConfig,
        description: 'Create a new administrator in Mira App Server',
        defaults: {
            name: 'Mira Admin Create',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: miraTokenCredentials,
        properties: [
            ...miraTokenProperties,
            {
                displayName: 'Username',
                name: 'username',
                type: 'string',
                required: true,
                default: '',
                description: 'Administrator username',
            },
            {
                displayName: 'Email',
                name: 'email',
                type: 'string',
                required: true,
                default: '',
                description: 'Administrator email',
            },
            {
                displayName: 'Password',
                name: 'password',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                required: true,
                default: '',
                description: 'Administrator password',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return await processMiraItems(
            this,
            async (itemIndex: number): Promise<MiraHttpOptions> => {
                const username = this.getNodeParameter('username', itemIndex) as string;
                const email = this.getNodeParameter('email', itemIndex) as string;
                const password = this.getNodeParameter('password', itemIndex) as string;

                return {
                    method: 'POST',
                    endpoint: '/api/admins',
                    body: {
                        username,
                        email,
                        password,
                    },
                };
            }
        );
    }
}
