import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
    INodeProperties,
} from 'n8n-workflow';

import { miraCommonNodeConfig } from '../../shared/mira-common-properties';
import { processMiraItems } from '../../shared/mira-http-helper';

export class MiraUserUpdate implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira User Update',
        name: 'miraUserUpdate',
        description: 'Update current user information in Mira App Server',
        defaults: {
            name: 'Mira User Update',
        },
        properties: [
            {
                displayName: 'Real Name',
                name: 'realName',
                type: 'string',
                default: '',
                description: 'User real name (leave empty to keep unchanged)',
            },
            {
                displayName: 'Avatar',
                name: 'avatar',
                type: 'string',
                default: '',
                description: 'User avatar URL (leave empty to keep unchanged)',
                placeholder: 'https://example.com/avatar.jpg',
            },
            {
                displayName: 'Description',
                name: 'desc',
                type: 'string',
                default: '',
                description: 'User description (leave empty to keep unchanged)',
            },
            {
                displayName: 'Password',
                name: 'password',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                description: 'New password (leave empty to keep unchanged)',
            },
        ] as INodeProperties[],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return processMiraItems.call(this, async (i: number) => {
            const realName = this.getNodeParameter('realName', i) as string;
            const avatar = this.getNodeParameter('avatar', i) as string;
            const desc = this.getNodeParameter('desc', i) as string;
            const password = this.getNodeParameter('password', i) as string;

            const updateData: any = {};

            if (realName) updateData.realName = realName;
            if (avatar) updateData.avatar = avatar;
            if (desc) updateData.desc = desc;
            if (password) updateData.password = password;

            // Check if at least one field is provided
            if (Object.keys(updateData).length === 0) {
                throw new NodeOperationError(this.getNode(), 'At least one field must be provided for update', {
                    itemIndex: i,
                });
            }

            const options = {
                method: 'PUT' as const,
                url: '/api/user/info',
                body: updateData,
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                updated: true,
                changes: {
                    realName: realName || '(unchanged)',
                    avatar: avatar || '(unchanged)',
                    description: desc || '(unchanged)',
                    password: password ? '(updated)' : '(unchanged)',
                },
                response,
                timestamp: new Date().toISOString(),
                operation: 'updateInfo',
            };
        });
    }
}
