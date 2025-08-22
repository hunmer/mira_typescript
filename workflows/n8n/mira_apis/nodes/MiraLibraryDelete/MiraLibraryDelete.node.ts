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
import { processMiraItems, validateRequiredParameter } from '../../shared/mira-http-helper';

export class MiraLibraryDelete implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira Library Delete',
        name: 'miraLibraryDelete',
        description: 'Delete a library from Mira App Server',
        defaults: {
            name: 'Mira Library Delete',
        },
        credentials: [
            {
                name: 'MiraApiCredential',
                required: true,
            },
        ],
        properties: [
            {
                displayName: '⚠️ Warning: This action will permanently delete the library and all its data!',
                name: 'deleteWarning',
                type: 'notice',
                default: '',
            },
            {
                displayName: 'Library ID',
                name: 'libraryId',
                type: 'string',
                required: true,
                default: '',
                description: 'The ID of the library to delete',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return processMiraItems.call(this, async (i: number) => {
            const libraryId = this.getNodeParameter('libraryId', i) as string;
            validateRequiredParameter(this, 'Library ID', libraryId, i);

            const options = {
                method: 'DELETE' as const,
                url: `/api/libraries/${libraryId}`,
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                deleted: true,
                libraryId,
                response,
                timestamp: new Date().toISOString(),
                operation: 'delete',
            };
        });
    }
}
