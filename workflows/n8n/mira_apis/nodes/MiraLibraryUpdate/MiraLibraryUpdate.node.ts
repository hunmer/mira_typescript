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

export class MiraLibraryUpdate implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira Library Update',
        name: 'miraLibraryUpdate',
        description: 'Update a library in Mira App Server',
        defaults: {
            name: 'Mira Library Update',
        },
        properties: [
            {
                displayName: 'Library ID',
                name: 'libraryId',
                type: 'string',
                required: true,
                default: '',
                description: 'The ID of the library to update',
            },
            {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: '',
                description: 'Library name (leave empty to keep unchanged)',
            },
            {
                displayName: 'Description',
                name: 'description',
                type: 'string',
                default: '',
                description: 'Library description (leave empty to keep unchanged)',
            },
            {
                displayName: 'Enable Hash',
                name: 'enableHash',
                type: 'boolean',
                default: false,
                description: 'Enable hash calculation for files',
            },
        ] as INodeProperties[],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return processMiraItems.call(this, async (i: number) => {
            const libraryId = this.getNodeParameter('libraryId', i) as string;
            const name = this.getNodeParameter('name', i) as string;
            const description = this.getNodeParameter('description', i) as string;
            const enableHash = this.getNodeParameter('enableHash', i) as boolean;

            if (!libraryId) {
                throw new NodeOperationError(this.getNode(), 'Library ID is required', {
                    itemIndex: i,
                });
            }

            const body: any = {
                customFields: {
                    enableHash,
                },
            };

            if (name) body.name = name;
            if (description) body.description = description;

            const options = {
                method: 'PUT' as const,
                url: `/api/libraries/${libraryId}`,
                body,
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                updated: true,
                libraryId,
                changes: {
                    name: name || '(unchanged)',
                    description: description || '(unchanged)',
                    enableHash,
                },
                response,
                timestamp: new Date().toISOString(),
                operation: 'update',
            };
        });
    }
}
