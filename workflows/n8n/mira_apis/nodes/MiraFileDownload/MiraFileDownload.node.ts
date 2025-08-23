import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    NodeOperationError,
} from 'n8n-workflow';
import { miraCommonNodeConfig, miraTokenProperties, miraTokenCredentials } from '../../shared/mira-common-properties';
import { makeMiraRequest } from '../../shared/mira-auth-helper';

export class MiraFileDownload implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira File Download',
        name: 'miraFileDownload',
        ...miraCommonNodeConfig,
        group: ['file'],
        description: 'Download files from Mira App Server library',
        defaults: {
            name: 'Mira File Download',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: miraTokenCredentials,
        properties: [
            ...miraTokenProperties,
            {
                displayName: 'Library ID',
                name: 'libraryId',
                type: 'string',
                required: true,
                default: '',
                description: 'Library ID where the file is stored',
                placeholder: '12345',
            },
            {
                displayName: 'File ID',
                name: 'fileId',
                type: 'string',
                required: true,
                default: '',
                description: 'File ID to download (numeric ID from the database)',
                placeholder: '123',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                // Get raw parameters first to debug
                let libraryIdRaw: any;
                let fileIdRaw: any;

                try {
                    libraryIdRaw = this.getNodeParameter('libraryId', i);
                    fileIdRaw = this.getNodeParameter('fileId', i);
                } catch (paramError) {
                    throw new NodeOperationError(
                        this.getNode(),
                        `Failed to resolve parameters: ${(paramError as Error).message}`,
                        { itemIndex: i }
                    );
                }

                this.logger.info(`Raw parameters - libraryId: ${JSON.stringify(libraryIdRaw)}, fileId: ${JSON.stringify(fileIdRaw)}`);

                // Convert to strings safely
                const libraryId = libraryIdRaw != null ? String(libraryIdRaw).trim() : '';
                const fileId = fileIdRaw != null ? String(fileIdRaw).trim() : '';

                this.logger.info(`Downloading file ${fileId} from library ${libraryId}`);

                // Validate required parameters
                if (!libraryId || libraryId === '') {
                    throw new NodeOperationError(
                        this.getNode(),
                        'Library ID is required and cannot be empty',
                        { itemIndex: i }
                    );
                }

                if (!fileId || fileId === '') {
                    throw new NodeOperationError(
                        this.getNode(),
                        'File ID is required and cannot be empty',
                        { itemIndex: i }
                    );
                }

                // First, make a HEAD request to get headers (content-type)
                const headResponse = await makeMiraRequest(this, i, {
                    method: 'HEAD',
                    endpoint: `/api/files/file/${libraryId}/${fileId}`,
                    returnFullResponse: true,
                });

                // Get content-type from headers
                const contentType = headResponse.headers['content-type'] || '';
                this.logger.info(`Content-Type from HEAD request: ${contentType}`);

                // Function to get file extension from content-type
                const getFileExtensionFromContentType = (contentType: string): string => {
                    const mimeToExt: Record<string, string> = {
                        'image/jpeg': '.jpg',
                        'image/jpg': '.jpg',
                        'image/png': '.png',
                        'image/gif': '.gif',
                        'image/webp': '.webp',
                        'image/bmp': '.bmp',
                        'image/svg+xml': '.svg',
                        'image/tiff': '.tiff',
                        'text/plain': '.txt',
                        'text/html': '.html',
                        'text/css': '.css',
                        'text/javascript': '.js',
                        'application/javascript': '.js',
                        'application/json': '.json',
                        'application/xml': '.xml',
                        'text/xml': '.xml',
                        'application/pdf': '.pdf',
                        'application/msword': '.doc',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                        'application/vnd.ms-excel': '.xls',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                        'application/vnd.ms-powerpoint': '.ppt',
                        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
                        'application/zip': '.zip',
                        'application/x-rar-compressed': '.rar',
                        'application/x-7z-compressed': '.7z',
                        'audio/mpeg': '.mp3',
                        'audio/wav': '.wav',
                        'audio/ogg': '.ogg',
                        'video/mp4': '.mp4',
                        'video/avi': '.avi',
                        'video/quicktime': '.mov',
                        'video/x-msvideo': '.avi',
                        'application/octet-stream': '.bin',
                    };

                    // Extract the main content type (before semicolon)
                    const mainContentType = contentType.split(';')[0].trim().toLowerCase();
                    return mimeToExt[mainContentType] || '';
                };

                // Generate filename with proper extension
                const fileExtension = getFileExtensionFromContentType(contentType);
                const fileName = `file_${fileId}${fileExtension}`;

                // Now make the actual download request with proper binary handling
                const binaryResponse = await makeMiraRequest(this, i, {
                    method: 'GET',
                    endpoint: `/api/files/file/${libraryId}/${fileId}`,
                    encoding: null, // This ensures binary data is returned as Buffer
                    returnFullResponse: false, // Don't need full response this time
                });

                this.logger.info(`Binary response type: ${typeof binaryResponse}, length: ${binaryResponse?.length || 'unknown'}`);

                // Handle the binary response
                let binaryData;
                if (binaryResponse && typeof binaryResponse === 'object' && binaryResponse.length !== undefined) {
                    // Response is likely a Buffer or buffer-like object
                    binaryData = await this.helpers.prepareBinaryData(
                        binaryResponse,
                        fileName,
                    );
                } else if (typeof binaryResponse === 'string') {
                    // Fallback: convert string to buffer (treating as latin1/binary)
                    this.logger.warn(`Response is string, converting to buffer. Length: ${binaryResponse.length}`);
                    const buffer = globalThis.Buffer.from(binaryResponse, 'latin1'); // Use latin1 to preserve bytes
                    binaryData = await this.helpers.prepareBinaryData(
                        buffer,
                        fileName,
                    );
                } else {
                    throw new Error(`Unexpected response type: ${typeof binaryResponse}`);
                }

                returnData.push({
                    json: {
                        message: 'File downloaded successfully',
                        operation: 'file_download',
                        libraryId: libraryId,
                        fileId: fileId,
                        fileName: binaryData.fileName,
                        fileSize: binaryData.fileSize,
                        mimeType: binaryData.mimeType,
                        timestamp: new Date().toISOString(),
                    },
                    binary: {
                        data: binaryData,
                    },
                    pairedItem: { item: i },
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`Error in MiraFileDownload: ${errorMessage}`);

                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: errorMessage },
                        pairedItem: { item: i },
                    });
                    continue;
                }

                throw new NodeOperationError(
                    this.getNode(),
                    `File download failed: ${errorMessage}`,
                    { itemIndex: i }
                );
            }
        }

        return [returnData];
    }
}
