import { INodeProperties, NodeConnectionType } from 'n8n-workflow';

/**
 * Common properties for Mira API token authentication
 */
export const miraTokenProperties: INodeProperties[] = [
    {
        displayName: 'Token Source',
        name: 'tokenSource',
        type: 'options',
        options: [
            {
                name: 'From Credentials',
                value: 'credentials',
                description: 'Use token from Mira API credentials',
            },
            {
                name: 'From Input',
                value: 'input',
                description: 'Use token from input data (e.g., from login operation)',
            },
        ],
        default: 'credentials',
        description: 'Choose where to get the access token from',
    },
    {
        displayName: 'Server URL',
        name: 'serverUrl',
        type: 'string',
        displayOptions: {
            show: {
                tokenSource: ['input'],
            },
        },
        default: 'http://localhost:8081',
        description: 'The URL of the Mira App Server',
    },
    {
        displayName: 'Access Token',
        name: 'accessToken',
        type: 'string',
        typeOptions: {
            password: true,
        },
        displayOptions: {
            show: {
                tokenSource: ['input'],
            },
        },
        default: '',
        description: 'Access token for authentication. Can use expressions like {{ $json.accessToken }}',
        placeholder: '{{ $json.accessToken }}',
    },
];

/**
 * Common credentials configuration for Mira API token authentication
 */
export const miraTokenCredentials = [
    {
        name: 'MiraApiCredential',
        required: false,
        displayOptions: {
            show: {
                tokenSource: ['credentials'],
            },
        },
    },
];

/**
 * Common node configuration for Mira API nodes
 */
export const miraCommonNodeConfig = {
    icon: 'file:mira.svg' as const,
    group: ['output'],
    version: 1,
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
};
