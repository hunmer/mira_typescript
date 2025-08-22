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

export class MiraLibraryStart implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira Library Start',
        name: 'miraLibraryStart',
        description: 'Start a library service in Mira App Server',
        defaults: {
            name: 'Mira Library Start',
        },
        properties: [
            {
                displayName: 'Library ID',
                name: 'libraryId',
                type: 'string',
                required: true,
                default: '',
                description: 'The ID of the library to start',
            },
        ] as INodeProperties[],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return processMiraItems.call(this, async (i: number) => {
            const libraryId = this.getNodeParameter('libraryId', i) as string;

            if (!libraryId) {
                throw new NodeOperationError(this.getNode(), 'Library ID is required', {
                    itemIndex: i,
                });
            }

            const options = {
                method: 'POST' as const,
                url: `/api/libraries/${libraryId}/start`,
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                started: true,
                libraryId,
                response,
                timestamp: new Date().toISOString(),
                operation: 'start',
            };
        });
    }
}
