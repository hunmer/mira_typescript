// 扩展axios类型定义
declare module 'axios' {
    export interface InternalAxiosRequestConfig {
        metadata?: {
            startTime: number;
        };
    }
}
