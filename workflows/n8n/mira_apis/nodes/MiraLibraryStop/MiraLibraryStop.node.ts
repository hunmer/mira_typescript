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

export class MiraLibraryStop implements INodeType {
    description: INodeTypeDescription = {
        ...miraCommonNodeConfig,
        displayName: 'Mira Library Stop',
        name: 'miraLibraryStop',
        description: 'Stop a library service in Mira App Server',
        defaults: {
            name: 'Mira Library Stop',
        },
        properties: [
            {
                displayName: 'Library ID',
                name: 'libraryId',
                type: 'string',
                required: true,
                default: '',
                description: 'The ID of the library to stop',
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
                url: `/api/libraries/${libraryId}/stop`,
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(
                this,
                'MiraApiCredential',
                options,
            );

            return {
                stopped: true,
                libraryId,
                response,
                timestamp: new Date().toISOString(),
                operation: 'stop',
            };
        });
    }
}
