import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    NodeOperationError,
} from 'n8n-workflow';
import { miraCommonNodeConfig } from '../../shared/mira-common-properties';

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
        credentials: [
            {
                name: 'MiraApiCredential',
                required: true,
            },
        ],
        properties: [
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
            {
                displayName: 'File Name',
                name: 'fileName',
                type: 'string',
                required: false,
                default: '',
                description: 'Custom file name for the downloaded file. If empty, uses the server file name',
                placeholder: 'my-file.pdf',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const libraryId = String(this.getNodeParameter('libraryId', i)).trim();
                const fileId = String(this.getNodeParameter('fileId', i)).trim();
                const customFileName = String(this.getNodeParameter('fileName', i, '')).trim();

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

                // Get credentials and build URL
                const credentials = await this.getCredentials('MiraApiCredential');
                const url = `${credentials.serverUrl}/api/files/file/${libraryId}/${fileId}`;

                // Prepare headers for authentication
                const headers: Record<string, string> = {
                    'Authorization': `Bearer ${credentials.accessToken}`,
                    'Accept': '*/*', // Accept any file type
                };

                // Make the request with arraybuffer encoding for binary data
                const response = await this.helpers.httpRequest({
                    url: url,
                    method: 'GET',
                    encoding: 'arraybuffer', // 关键设置：获取二进制数据
                    headers: headers,
                    returnFullResponse: true, // 需要获取响应头
                });

                // 确定最终文件名：优先使用用户输入，否则使用服务器文件名
                let finalFileName = customFileName;
                if (!finalFileName) {
                    // 从响应头获取文件名
                    finalFileName = `file_${fileId}`;
                    if (response.headers && response.headers['x-file-name']) {
                        finalFileName = decodeURIComponent(response.headers['x-file-name'] as string);
                    } else if (response.headers && response.headers['content-disposition']) {
                        const contentDisposition = response.headers['content-disposition'] as string;
                        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                        if (fileNameMatch && fileNameMatch[1]) {
                            finalFileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''));
                        }
                    }
                }

                const binaryData = await this.helpers.prepareBinaryData(
                    response.body as any,
                    finalFileName,
                );

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
