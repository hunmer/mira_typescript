import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    NodeOperationError,
} from 'n8n-workflow';
import FormData from 'form-data';
import { miraTokenProperties, miraTokenCredentials, miraCommonNodeConfig } from '../../shared/mira-common-properties';
import { getMiraAuthConfig } from '../../shared/mira-auth-helper';
import { validateRequiredParameter } from '../../shared/mira-http-helper';

export class MiraFileUpload implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira File Upload',
        name: 'miraFileUpload',
        ...miraCommonNodeConfig,
        group: ['file'],
        description: 'Upload files to library in Mira App Server',
        defaults: {
            name: 'Mira File Upload',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: miraTokenCredentials,
        properties: [
            ...miraTokenProperties.map(prop =>
                prop.name === 'tokenSource'
                    ? { ...prop, default: 'input' }  // Override default to 'input'
                    : prop
            ),
            {
                displayName: 'Library ID',
                name: 'libraryId',
                type: 'string',
                required: true,
                default: '',
                description: 'Target library ID for file upload',
                placeholder: '12345',
            },
            {
                displayName: 'Input Binary Field',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'file',
                required: true,
                description: 'Name of the binary property containing the file to upload',
                placeholder: 'file',
            },
            {
                displayName: 'Source Path',
                name: 'sourcePath',
                type: 'string',
                default: '',
                description: 'Local file path for validation (optional)',
            },
            {
                displayName: 'Client ID',
                name: 'clientId',
                type: 'string',
                default: '',
                description: 'Client ID (optional)',
            },
            {
                displayName: 'Tags',
                name: 'tags',
                type: 'string',
                default: '',
                description: 'Comma-separated list of tags (optional)',
                placeholder: 'tag1, tag2, tag3',
            },
            {
                displayName: 'Folder ID',
                name: 'folderId',
                type: 'string',
                default: '',
                description: 'Target folder ID (optional)',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const libraryId = this.getNodeParameter('libraryId', i) as string;
                const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
                const sourcePath = this.getNodeParameter('sourcePath', i) as string;
                const clientId = this.getNodeParameter('clientId', i) as string;
                const tags = this.getNodeParameter('tags', i) as string;
                const folderId = this.getNodeParameter('folderId', i) as string;

                // Validate required parameters
                validateRequiredParameter(this, 'Library ID', libraryId, i);

                // -----------------------
                // Binary data resolution
                // -----------------------
                const itemData = items[i];
                let binaryData: any;
                let usedBinaryKey = binaryPropertyName; // track actual key used so we fetch buffer correctly

                const resolveBinary = (key: string) => this.helpers.assertBinaryData(i, key);

                try {
                    binaryData = resolveBinary(binaryPropertyName);
                } catch (err) {
                    const availableBinaryKeys = itemData.binary ? Object.keys(itemData.binary) : [];
                    if (availableBinaryKeys.length === 0) {
                        throw new NodeOperationError(
                            this.getNode(),
                            `No binary data found in item ${i}. Expected property '${binaryPropertyName}'.`,
                            { itemIndex: i }
                        );
                    }
                    // Prefer common fallbacks 'file' or 'files' first
                    const preferredOrder = ['file', 'files', ...availableBinaryKeys];
                    const fallback = preferredOrder.find(k => availableBinaryKeys.includes(k));
                    if (!fallback) {
                        throw new NodeOperationError(
                            this.getNode(),
                            `Binary property '${binaryPropertyName}' not found. Available: ${availableBinaryKeys.join(', ')}`,
                            { itemIndex: i }
                        );
                    }
                    binaryData = resolveBinary(fallback);
                    usedBinaryKey = fallback; // record actual key used
                }

                // Fetch buffer using the resolved key (fixes previous bug using original name even after fallback)
                const fileBuffer = await this.helpers.getBinaryDataBuffer(i, usedBinaryKey);

                // Common tag parsing once
                const tagList = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

                // Build real multipart/form-data using form-data library
                // This creates proper multipart format that Express.Multer can parse
                const formData = new FormData();

                // Add text fields
                formData.append('libraryId', libraryId.trim());
                formData.append('payload', JSON.stringify({
                    data: {
                        tags: tagList,
                        folder_id: folderId || null,
                    },
                }));

                // Add file as proper multipart file field
                formData.append('files', fileBuffer, {
                    filename: binaryData.fileName || 'uploaded_file',
                    contentType: binaryData.mimeType || 'application/octet-stream',
                });

                // Add optional fields
                if (clientId && clientId.trim()) formData.append('clientId', clientId.trim());
                if (sourcePath && sourcePath.trim()) formData.append('sourcePath', sourcePath.trim());
                // Reuse auth helper to reduce duplicated logic
                const authConfig = await getMiraAuthConfig(this, i);

                let response: any;
                if (authConfig.useCredentials) {
                    const requestOptions: any = {
                        method: 'POST',
                        url: '/api/files/upload',
                        headers: {
                            ...formData.getHeaders(), // This includes Content-Type: multipart/form-data; boundary=...
                        },
                        body: formData,
                    };
                    response = await this.helpers.httpRequestWithAuthentication.call(this, 'MiraApiCredential', requestOptions);
                } else {
                    const requestOptions: any = {
                        method: 'POST',
                        url: `${authConfig.serverUrl}/api/files/upload`,
                        headers: {
                            Authorization: `Bearer ${authConfig.token}`,
                            ...formData.getHeaders(), // This includes Content-Type: multipart/form-data; boundary=...
                        },
                        body: formData,
                    };
                    response = await this.helpers.httpRequest(requestOptions);
                }

                // Enhance response with upload metadata
                const enhancedResponse = {
                    ...response,
                    operation: 'file_upload',
                    libraryId: libraryId.trim(),
                    fileName: binaryData.fileName || 'uploaded_file',
                    fileSize: binaryData.fileSize,
                    mimeType: binaryData.mimeType,
                    timestamp: new Date().toISOString(),
                    binaryPropertyUsed: usedBinaryKey,
                };

                returnData.push({
                    json: enhancedResponse,
                    pairedItem: { item: i },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: (error as Error).message },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error as Error, {
                    itemIndex: i,
                });
            }
        }

        return [returnData];
    }
}
