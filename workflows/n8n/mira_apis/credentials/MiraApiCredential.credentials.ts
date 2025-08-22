import {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class MiraApiCredential implements ICredentialType {
    name = 'MiraApiCredential';
    displayName = 'Mira API';
    documentationUrl = 'https://mira.example.com/docs';
    properties: INodeProperties[] = [
        {
            displayName: 'Server URL',
            name: 'serverUrl',
            type: 'string',
            default: 'http://localhost:8081',
            description: 'The URL of the Mira App Server',
            required: true,
        },
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            description: 'Access token for authentication (get from login operation)',
            required: true,
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.accessToken}}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials.serverUrl}}',
            url: '/api/auth/verify',
            method: 'GET',
        },
    };
}
