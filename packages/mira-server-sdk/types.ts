/**
 * Mira SDK 类型定义
 */

// 基础响应类型
export interface BaseResponse<T = any> {
    code?: number;
    success?: boolean;
    message: string;
    data: T;
    timestamp?: string;
}

// 错误响应类型
export interface ErrorResponse {
    error: string;
    message: string;
    timestamp: string;
    stack?: string;
}

// HTTP 客户端配置
export interface ClientConfig {
    baseURL: string;
    timeout?: number;
    headers?: Record<string, string>;
    token?: string;
}

// 认证相关类型
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
}

export interface RegisterRequest {
    username: string;
    password: string;
}

export interface RegisterResponse {
    success: boolean;
    message: string;
    data?: {
        id: number;
        username: string;
    };
}

export interface UserInfo {
    id: number;
    username: string;
    realName: string;
    roles: string[];
    avatar: string;
    desc: string;
    homePath: string;
    role?: string;
}

export interface VerifyResponse {
    user: UserInfo;
}

// 管理员类型
export interface Admin {
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAdminRequest {
    username: string;
    email: string;
    password: string;
}

// 素材库类型
export interface Library {
    id: string;
    name: string;
    path: string;
    type: 'local' | 'remote';
    status: 'active' | 'inactive' | 'error';
    fileCount: number;
    size: number;
    description: string;
    createdAt: string;
    updatedAt: string;
    icon?: string;
    customFields?: {
        enableHash?: boolean;
    };
    serverURL?: string;
    serverPort?: number;
    pluginsDir?: string;
}

export interface CreateLibraryRequest {
    name: string;
    path: string;
    type: 'local' | 'remote';
    description: string;
    icon?: string;
    customFields?: {
        enableHash?: boolean;
    };
    serverURL?: string;
    serverPort?: number;
    pluginsDir?: string;
}

export interface UpdateLibraryRequest {
    name?: string;
    description?: string;
    customFields?: {
        enableHash?: boolean;
    };
}

// 插件类型
export interface Plugin {
    id: string;
    pluginName: string;
    name: string;
    version: string;
    description: string;
    author: string;
    status: 'active' | 'inactive';
    configurable: boolean;
    dependencies: string[];
    main: string;
    libraryId: string;
    createdAt: string;
    updatedAt: string;
    icon: string;
    category: string;
    tags: string[];
}

export interface PluginsByLibrary {
    id: string;
    name: string;
    description: string;
    plugins: Plugin[];
}

export interface InstallPluginRequest {
    name: string;
    version?: string;
    libraryId: string;
}

// 文件类型
export interface UploadFileRequest {
    files: File[] | FileList;
    libraryId: string;
    sourcePath?: string;
    clientId?: string;
    fields?: any;
    payload?: {
        data: {
            tags?: string[];
            folder_id?: string;
        };
    };
}

export interface UploadResult {
    success: boolean;
    file: string;
    result?: any;
    error?: string;
}

export interface UploadResponse {
    results: UploadResult[];
}

// 数据库类型
export interface DatabaseTable {
    name: string;
    schema: string;
    rowCount: number;
}

export interface TableColumn {
    name: string;
    type: string;
    notnull: number;
    pk: number;
    dflt_value: string;
}

// 设备类型
export interface Device {
    clientId: string;
    libraryId: string;
    connectionTime: string;
    lastActivity: string;
    requestInfo: {
        url: string;
        headers: Record<string, any>;
        remoteAddress: string;
    };
    status: 'connected' | 'disconnected';
    userAgent: string;
    ipAddress: string;
}

export interface DevicesResponse {
    success: boolean;
    data: Record<string, Device[]>;
    timestamp: string;
}

export interface DeviceStatsResponse {
    success: boolean;
    data: {
        totalDevices: number;
        connectedDevices: number;
        libraryStats: Record<string, {
            deviceCount: number;
            activeConnections: number;
        }>;
    };
}

export interface DisconnectDeviceRequest {
    clientId: string;
    libraryId: string;
}

export interface SendMessageRequest {
    clientId: string;
    libraryId: string;
    message: any;
}

// 系统状态类型
export interface HealthResponse {
    success: boolean;
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
    nodeVersion?: string;
    environment?: string;
}

// 更新用户信息请求
export interface UpdateUserRequest {
    realName?: string;
    avatar?: string;
}
