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
                displayName: 'File ID',
                name: 'fileId',
                type: 'string',
                default: '',
                description: 'File ID for update operation (optional). If provided, will update existing file instead of creating new one',
                placeholder: '123',
            },
            {
                displayName: 'Input Binary Field',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'file',
                required: false,
                description: 'Name of the binary property containing the file to upload (required if File ID is not provided)',
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
                const libraryId = String(this.getNodeParameter('libraryId', i) || '').trim();
                const fileId = String(this.getNodeParameter('fileId', i) || '').trim();
                const binaryPropertyName = String(this.getNodeParameter('binaryPropertyName', i) || '').trim();
                const sourcePath = String(this.getNodeParameter('sourcePath', i) || '').trim();
                const clientId = String(this.getNodeParameter('clientId', i) || '').trim();
                const tags = String(this.getNodeParameter('tags', i) || '').trim();
                const folderId = String(this.getNodeParameter('folderId', i) || '').trim();

                // Validate required parameters
                validateRequiredParameter(this, 'Library ID', libraryId, i);

                // Validate that either fileId (for update) or binaryPropertyName (for upload) is provided
                const hasFileId = fileId && fileId.length > 0;
                const hasBinaryProperty = binaryPropertyName && binaryPropertyName.length > 0;

                if (!hasFileId && !hasBinaryProperty) {
                    throw new NodeOperationError(
                        this.getNode(),
                        'Either File ID (for update operation) or Input Binary Field (for upload operation) must be provided',
                        { itemIndex: i }
                    );
                }

                // -----------------------
                // Binary data resolution (only if binaryPropertyName is provided)
                // -----------------------
                let binaryData: any = null;
                let fileBuffer: any = null;
                let usedBinaryKey = binaryPropertyName; // track actual key used so we fetch buffer correctly

                if (hasBinaryProperty) {
                    const itemData = items[i];
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
                    fileBuffer = await this.helpers.getBinaryDataBuffer(i, usedBinaryKey);
                }

                // Common tag parsing once
                const tagList = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

                // Build real multipart/form-data using form-data library
                // This creates proper multipart format that Express.Multer can parse
                const formData = new FormData();

                // Add text fields
                formData.append('libraryId', libraryId);

                // Add fileId for update operation if provided
                if (hasFileId) {
                    formData.append('fileId', fileId);
                }

                formData.append('payload', JSON.stringify({
                    data: {
                        tags: tagList,
                        folder_id: folderId || null,
                    },
                }));

                // Add file as proper multipart file field (only if binary data is available)
                if (fileBuffer && binaryData) {
                    formData.append('files', fileBuffer, {
                        filename: binaryData.fileName || 'uploaded_file',
                        contentType: binaryData.mimeType || 'application/octet-stream',
                    });
                }

                // Add optional fields
                if (clientId) formData.append('clientId', clientId);
                if (sourcePath) formData.append('sourcePath', sourcePath);
                // Reuse auth helper to reduce duplicated logic
                const authConfig = await getMiraAuthConfig(this, i);
                this.logger.debug('Auth config:', { useCredentials: authConfig.useCredentials, hasToken: !!authConfig.token });

                let response: any;
                if (authConfig.useCredentials) {
                    const requestOptions: any = {
                        method: 'POST',
                        url: `${authConfig.serverUrl.trim()}/api/files/upload`,  // Use relative path for credentials
                        headers: {
                            ...formData.getHeaders(), // This includes Content-Type: multipart/form-data; boundary=...
                        },
                        body: formData,
                    };
                    this.logger.debug('Mira API request (credentials):', { url: requestOptions.url, headers: Object.keys(requestOptions.headers) });
                    response = await this.helpers.httpRequestWithAuthentication.call(this, 'MiraApiCredential', requestOptions);
                } else {
                    // Validate serverUrl for token-based authentication
                    if (!authConfig.serverUrl || !authConfig.serverUrl.trim()) {
                        throw new NodeOperationError(
                            this.getNode(),
                            'Server URL is required when using token-based authentication',
                            { itemIndex: i }
                        );
                    }

                    const fullUrl = `${authConfig.serverUrl.trim()}/api/files/upload`;
                    this.logger.debug('Mira API request (token):', { url: fullUrl });
                    const requestOptions: any = {
                        method: 'POST',
                        url: fullUrl,  // Use full URL for token-based auth
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
                    operation: hasFileId ? 'file_update' : 'file_upload',
                    libraryId: libraryId,
                    fileId: hasFileId ? fileId : undefined,
                    fileName: binaryData ? (binaryData.fileName || 'uploaded_file') : undefined,
                    fileSize: binaryData ? binaryData.fileSize : undefined,
                    mimeType: binaryData ? binaryData.mimeType : undefined,
                    timestamp: new Date().toISOString(),
                    binaryPropertyUsed: hasBinaryProperty ? usedBinaryKey : undefined,
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
