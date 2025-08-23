import {
    IExecuteFunctions,
    IHttpRequestMethods,
    IHttpRequestOptions,
    NodeOperationError,
} from 'n8n-workflow';

/**
 * Interface for Mira authentication configuration
 */
export interface MiraAuthConfig {
    tokenSource: 'credentials' | 'input';
    serverUrl?: string;
    accessToken?: string;
}

/**
 * Interface for Mira HTTP request options
 */
export interface MiraHttpOptions {
    method: IHttpRequestMethods;
    endpoint: string;
    body?: any;
    headers?: Record<string, string>;
    returnFullResponse?: boolean;
    encoding?: 'utf8' | 'binary' | null;
}

/**
 * Get authentication configuration and server URL for Mira API calls
 */
export async function getMiraAuthConfig(
    executeFunctions: IExecuteFunctions,
    itemIndex: number
): Promise<{ serverUrl: string; useCredentials: boolean; token?: string }> {
    const tokenSource = executeFunctions.getNodeParameter('tokenSource', itemIndex) as string;

    if (tokenSource === 'credentials') {
        const credentials = await executeFunctions.getCredentials('MiraApiCredential');
        return {
            serverUrl: credentials.serverUrl as string,
            useCredentials: true,
        };
    } else {
        const token = executeFunctions.getNodeParameter('accessToken', itemIndex) as string;
        const serverUrl = executeFunctions.getNodeParameter('serverUrl', itemIndex) as string;

        if (!token || token.trim() === '') {
            throw new NodeOperationError(
                executeFunctions.getNode(),
                'Access token is required when using input token source',
                { itemIndex }
            );
        }

        return {
            serverUrl,
            useCredentials: false,
            token,
        };
    }
}

/**
 * Make an authenticated HTTP request to Mira API
 */
export async function makeMiraRequest(
    executeFunctions: IExecuteFunctions,
    itemIndex: number,
    options: MiraHttpOptions
): Promise<any> {
    executeFunctions.logger.debug('Preparing Mira API request');
    const authConfig = await getMiraAuthConfig(executeFunctions, itemIndex);
    const url = `${authConfig.serverUrl}${options.endpoint}`;
    executeFunctions.logger.debug(`Making ${options.method} request to ${url}`);

    if (authConfig.useCredentials) {
        // Use credential-based authentication
        const requestOptions: any = {
            method: options.method,
            url,
            body: options.body,
            headers: options.headers,
            returnFullResponse: options.returnFullResponse || false,
        };

        // For binary responses (file downloads), set encoding to null
        if (options.encoding !== undefined) {
            requestOptions.encoding = options.encoding;
        }

        return await executeFunctions.helpers.httpRequestWithAuthentication.call(
            executeFunctions,
            'MiraApiCredential',
            requestOptions,
        );
    } else {
        // Use token-based authentication
        const headers = {
            'Authorization': `Bearer ${authConfig.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
        };

        const requestOptions: IHttpRequestOptions = {
            method: options.method,
            url,
            headers,
            body: options.body,
            returnFullResponse: options.returnFullResponse || false,
        } as any;

        // For binary responses (file downloads), set encoding to null
        if (options.encoding !== undefined) {
            (requestOptions as any).encoding = options.encoding;
        }

        return await executeFunctions.helpers.httpRequest(requestOptions);
    }
}

/**
 * Wrapper for handling common Mira API operations with error handling
 */
export async function executeMiraOperation(
    executeFunctions: IExecuteFunctions,
    itemIndex: number,
    options: MiraHttpOptions,
    enhanceResponse?: (response: any, itemIndex: number) => any
): Promise<any> {
    try {
        const response = await makeMiraRequest(executeFunctions, itemIndex, options);

        // Allow response enhancement (e.g., adding operation metadata)
        if (enhanceResponse) {
            return enhanceResponse(response, itemIndex);
        }

        return response;
    } catch (error) {
        if (executeFunctions.continueOnFail()) {
            return { error: (error as Error).message };
        }
        throw new NodeOperationError(executeFunctions.getNode(), error as Error, {
            itemIndex,
        });
    }
}
