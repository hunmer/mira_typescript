import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
} from 'n8n-workflow';
import { miraTokenProperties, miraTokenCredentials, miraCommonNodeConfig } from '../../shared/mira-common-properties';
import { processMiraItems, validateRequiredParameter, enhanceDeleteResponse } from '../../shared/mira-http-helper';
import { MiraHttpOptions } from '../../shared/mira-auth-helper';

export class MiraAdminDelete implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Admin Delete',
        name: 'miraAdminDelete',
        ...miraCommonNodeConfig,
        description: 'Delete administrator from Mira App Server (soft delete)',
        defaults: {
            name: 'Mira Admin Delete',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: miraTokenCredentials,
        properties: [
            ...miraTokenProperties,
            {
                displayName: 'Admin ID',
                name: 'adminId',
                type: 'string',
                required: true,
                default: '',
                description: 'ID of the administrator to delete. Can use expressions like {{ $json.id }}',
                placeholder: '{{ $json.id }}',
            },
            {
                displayName: '⚠️ Warning: This will soft delete the administrator account',
                name: 'confirmation',
                type: 'notice',
                default: '',
                typeOptions: {
                    theme: 'warning',
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return await processMiraItems(
            this,
            async (itemIndex: number): Promise<MiraHttpOptions> => {
                const adminId = this.getNodeParameter('adminId', itemIndex) as string;

                // Validate required parameters
                validateRequiredParameter(this, 'Admin ID', adminId, itemIndex);

                return {
                    method: 'DELETE',
                    endpoint: `/api/admins/${adminId}`,
                };
            },
            (response: any, itemIndex: number) => {
                const adminId = this.getNodeParameter('adminId', itemIndex) as string;
                return enhanceDeleteResponse(response, adminId, 'admin_soft_delete');
            }
        );
    }
}
