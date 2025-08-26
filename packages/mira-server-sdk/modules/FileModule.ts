import { HttpClient } from '../client/HttpClient';
import {
    UploadFileRequest,
    UploadResponse,
    BaseResponse,
} from '../types';

/**
 * 文件模块
 * 处理文件上传、下载、删除等操作
 */
export class FileModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 上传文件到指定素材库
     * @param uploadRequest 上传请求数据
     * @returns Promise<UploadResponse>
     */
    async upload(uploadRequest: UploadFileRequest): Promise<UploadResponse> {
        const formData = new FormData();

        // 添加文件
        if (uploadRequest.files instanceof FileList) {
            Array.from(uploadRequest.files).forEach((file, index) => {
                formData.append('files', file);
            });
        } else {
            uploadRequest.files.forEach((file, index) => {
                formData.append('files', file);
            });
        }

        // 添加其他字段
        formData.append('libraryId', uploadRequest.libraryId);

        if (uploadRequest.sourcePath) {
            formData.append('sourcePath', uploadRequest.sourcePath);
        }

        if (uploadRequest.clientId) {
            formData.append('clientId', uploadRequest.clientId);
        }

        if (uploadRequest.fields) {
            formData.append('fields', JSON.stringify(uploadRequest.fields));
        }

        if (uploadRequest.payload) {
            formData.append('payload', JSON.stringify(uploadRequest.payload));
        }

        return await this.httpClient.upload<UploadResponse>('/api/files/upload', formData);
    }

    /**
     * 下载文件
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @returns Promise<Blob>
     */
    async download(libraryId: string, fileId: string): Promise<Blob> {
        return await this.httpClient.download(`/api/files/download/${libraryId}/${fileId}`);
    }

    /**
     * 删除文件
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @returns Promise<BaseResponse>
     */
    async delete(libraryId: string, fileId: string): Promise<BaseResponse> {
        return await this.httpClient.delete<BaseResponse>(`/api/files/${libraryId}/${fileId}`);
    }

    /**
     * 上传单个文件
     * @param file 文件对象
     * @param libraryId 素材库ID
     * @param options 可选参数
     * @returns Promise<UploadResponse>
     */
    async uploadFile(
        file: File,
        libraryId: string,
        options?: {
            sourcePath?: string;
            clientId?: string;
            tags?: string[];
            folderId?: string;
        }
    ): Promise<UploadResponse> {
        const uploadRequest: UploadFileRequest = {
            files: [file],
            libraryId,
            sourcePath: options?.sourcePath,
            clientId: options?.clientId,
        };

        if (options?.tags || options?.folderId) {
            uploadRequest.payload = {
                data: {
                    tags: options.tags,
                    folder_id: options.folderId,
                },
            };
        }

        return await this.upload(uploadRequest);
    }

    /**
     * 上传多个文件
     * @param files 文件数组或FileList
     * @param libraryId 素材库ID
     * @param options 可选参数
     * @returns Promise<UploadResponse>
     */
    async uploadFiles(
        files: File[] | FileList,
        libraryId: string,
        options?: {
            sourcePath?: string;
            clientId?: string;
            tags?: string[];
            folderId?: string;
        }
    ): Promise<UploadResponse> {
        const uploadRequest: UploadFileRequest = {
            files,
            libraryId,
            sourcePath: options?.sourcePath,
            clientId: options?.clientId,
        };

        if (options?.tags || options?.folderId) {
            uploadRequest.payload = {
                data: {
                    tags: options.tags,
                    folder_id: options.folderId,
                },
            };
        }

        return await this.upload(uploadRequest);
    }

    /**
     * 上传文件到指定文件夹
     * @param file 文件对象
     * @param libraryId 素材库ID
     * @param folderId 文件夹ID
     * @param tags 标签数组
     * @returns Promise<UploadResponse>
     */
    async uploadToFolder(
        file: File,
        libraryId: string,
        folderId: string,
        tags?: string[]
    ): Promise<UploadResponse> {
        return await this.uploadFile(file, libraryId, { folderId, tags });
    }

    /**
     * 上传文件并添加标签
     * @param file 文件对象
     * @param libraryId 素材库ID
     * @param tags 标签数组
     * @returns Promise<UploadResponse>
     */
    async uploadWithTags(
        file: File,
        libraryId: string,
        tags: string[]
    ): Promise<UploadResponse> {
        return await this.uploadFile(file, libraryId, { tags });
    }

    /**
     * 下载文件并保存为指定文件名
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @param filename 保存的文件名
     * @returns Promise<void>
     */
    async downloadAndSave(
        libraryId: string,
        fileId: string,
        filename: string
    ): Promise<void> {
        const blob = await this.download(libraryId, fileId);

        // 创建下载链接
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // 清理
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    /**
     * 批量删除文件
     * @param libraryId 素材库ID
     * @param fileIds 文件ID数组
     * @returns Promise<BaseResponse[]>
     */
    async deleteMultiple(libraryId: string, fileIds: string[]): Promise<BaseResponse[]> {
        return await Promise.all(fileIds.map(fileId => this.delete(libraryId, fileId)));
    }
}
