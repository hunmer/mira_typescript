import {
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class MiraLoginCredential implements ICredentialType {
    name = 'MiraLoginCredential';
    displayName = 'Mira Login';
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
            displayName: 'Username',
            name: 'username',
            type: 'string',
            default: '',
            description: 'Username for authentication',
            required: true,
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            description: 'Password for authentication',
            required: true,
        },
    ];
}
