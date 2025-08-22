import {
    IExecuteFunctions,
    INodeExecutionData,
    NodeOperationError,
} from 'n8n-workflow';
import { executeMiraOperation, MiraHttpOptions } from './mira-auth-helper';

/**
 * Process multiple input items with Mira API operations
 */
export async function processMiraItems(
    executeFunctions: IExecuteFunctions,
    operation: (itemIndex: number) => Promise<MiraHttpOptions>,
    enhanceResponse?: (response: any, itemIndex: number) => any
): Promise<INodeExecutionData[][]> {
    const items = executeFunctions.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
        try {
            const httpOptions = await operation(i);
            const result = await executeMiraOperation(
                executeFunctions,
                i,
                httpOptions,
                enhanceResponse
            );

            returnData.push({
                json: result,
                pairedItem: { item: i },
            });
        } catch (error) {
            if (executeFunctions.continueOnFail()) {
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

/**
 * Validate required parameter is not empty
 */
export function validateRequiredParameter(
    executeFunctions: IExecuteFunctions,
    parameterName: string,
    value: string,
    itemIndex: number
): void {
    if (!value || value.trim() === '') {
        throw new NodeOperationError(
            executeFunctions.getNode(),
            `${parameterName} is required and cannot be empty`,
            { itemIndex }
        );
    }
}

/**
 * Common response enhancer for delete operations
 */
export function enhanceDeleteResponse(
    response: any,
    deletedId: string,
    operation: string = 'soft_delete'
): any {
    return {
        ...response,
        deletedId,
        operation,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Common response enhancer for create operations
 */
export function enhanceCreateResponse(
    response: any,
    operation: string = 'create'
): any {
    return {
        ...response,
        operation,
        timestamp: new Date().toISOString(),
    };
}
