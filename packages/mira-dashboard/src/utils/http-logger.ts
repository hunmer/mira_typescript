/**
 * HTTP请求日志工具类
 * 提供统一的HTTP请求和响应日志格式
 */

export interface LogConfig {
    enableConsole: boolean;
    enableFile: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    maxBodyLength: number;
    sensitiveFields: string[];
}

export class HttpLogger {
    private config: LogConfig;

    constructor(config: Partial<LogConfig> = {}) {
        this.config = {
            enableConsole: true,
            enableFile: false,
            logLevel: 'info',
            maxBodyLength: 10000,
            sensitiveFields: ['password', 'token', 'authorization', 'cookie'],
            ...config
        };
    }

    /**
     * 脱敏处理敏感字段
     */
    private sanitizeData(data: any): any {
        if (!data || typeof data !== 'object') {
            return data;
        }

        const sanitized = Array.isArray(data) ? [...data] : { ...data };

        for (const key in sanitized) {
            if (this.config.sensitiveFields.some(field =>
                key.toLowerCase().includes(field.toLowerCase())
            )) {
                sanitized[key] = '***SENSITIVE***';
            } else if (typeof sanitized[key] === 'object') {
                sanitized[key] = this.sanitizeData(sanitized[key]);
            }
        }

        return sanitized;
    }

    /**
     * 截断过长的内容
     */
    private truncateContent(content: any): any {
        if (typeof content === 'string' && content.length > this.config.maxBodyLength) {
            return content.substring(0, this.config.maxBodyLength) + '...[TRUNCATED]';
        }

        if (typeof content === 'object') {
            const stringified = JSON.stringify(content);
            if (stringified.length > this.config.maxBodyLength) {
                return JSON.stringify(content, null, 2).substring(0, this.config.maxBodyLength) + '...[TRUNCATED]';
            }
        }

        return content;
    }

    /**
     * 格式化请求日志
     */
    logRequest(config: any) {
        if (!this.config.enableConsole) return;

        const sanitizedHeaders = this.sanitizeData(config.headers);
        const sanitizedData = this.sanitizeData(config.data);
        const truncatedData = this.truncateContent(sanitizedData);

        console.group(`🚀 [${new Date().toISOString()}] HTTP Request`);
        console.log(`🔗 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);

        if (config.params && Object.keys(config.params).length > 0) {
            console.log(`❓ Query:`, this.sanitizeData(config.params));
        }

        console.log(`📤 Headers:`, sanitizedHeaders);

        if (config.data) {
            console.log(`📦 Body:`, truncatedData);
        }

        console.groupEnd();
    }

    /**
     * 格式化响应日志
     */
    logResponse(response: any, duration: number) {
        if (!this.config.enableConsole) return;

        const statusIcon = this.getStatusIcon(response.status);
        const sanitizedData = this.sanitizeData(response.data);
        const truncatedData = this.truncateContent(sanitizedData);

        console.group(`📥 [${new Date().toISOString()}] HTTP Response`);
        console.log(`${statusIcon} ${response.status} ${response.statusText} (${duration}ms)`);
        console.log(`🔗 ${response.config.method?.toUpperCase()} ${response.config.url}`);
        console.log(`📤 Headers:`, response.headers);

        if (response.data !== undefined) {
            console.log(`📦 Body:`, truncatedData);
        }

        console.groupEnd();
    }

    /**
     * 格式化错误日志
     */
    logError(error: any, duration: number) {
        if (!this.config.enableConsole) return;

        console.group(`❌ [${new Date().toISOString()}] HTTP Error`);

        if (error.config) {
            console.log(`🔗 ${error.config.method?.toUpperCase()} ${error.config.baseURL}${error.config.url}`);
        }

        if (error.response) {
            console.log(`💥 Status: ${error.response.status} ${error.response.statusText} (${duration}ms)`);
            console.log(`📤 Response Headers:`, error.response.headers);

            if (error.response.data) {
                const sanitizedData = this.sanitizeData(error.response.data);
                const truncatedData = this.truncateContent(sanitizedData);
                console.log(`📦 Error Body:`, truncatedData);
            }
        } else if (error.request) {
            console.log(`🚫 Network Error - No response received (${duration}ms)`);
            console.log(`📤 Request:`, error.request);
        } else {
            console.log(`⚠️ Error:`, error.message);
        }

        if (error.code) {
            console.log(`🏷️ Error Code:`, error.code);
        }

        console.groupEnd();
    }

    /**
     * 根据状态码获取对应图标
     */
    private getStatusIcon(status: number): string {
        if (status >= 200 && status < 300) return '✅';
        if (status >= 300 && status < 400) return '🔄';
        if (status >= 400 && status < 500) return '⚠️';
        if (status >= 500) return '❌';
        return '❓';
    }

    /**
     * 创建请求统计信息
     */
    createRequestStats() {
        const stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            responseTimes: [] as number[]
        };

        return {
            stats,
            updateStats: (duration: number, success: boolean) => {
                stats.totalRequests++;
                stats.responseTimes.push(duration);

                if (success) {
                    stats.successfulRequests++;
                } else {
                    stats.failedRequests++;
                }

                stats.averageResponseTime = stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length;
            },

            getStats: () => ({
                ...stats,
                successRate: stats.totalRequests > 0 ? (stats.successfulRequests / stats.totalRequests * 100).toFixed(2) + '%' : '0%'
            })
        };
    }
}

// 创建默认日志实例
export const httpLogger = new HttpLogger({
    enableConsole: true,
    logLevel: 'info',
    maxBodyLength: 5000,
    sensitiveFields: ['password', 'token', 'authorization', 'cookie', 'secret']
});

// 创建请求统计实例
export const requestStats = httpLogger.createRequestStats();
