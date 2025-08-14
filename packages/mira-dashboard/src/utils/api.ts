import axios from 'axios'
import { message } from 'ant-design-vue'
import { httpLogger, requestStats } from './http-logger'

// 在生产环境中，尝试从全局变量获取 API URL，否则使用环境变量或默认值
const getApiBaseUrl = () => {
    // 检查是否有全局配置（用于 Docker 运行时配置）
    if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__) {
        const runtimeApiUrl = (window as any).__RUNTIME_CONFIG__.API_BASE_URL
        if (runtimeApiUrl) {
            // 如果运行时配置的 API URL 是外部地址，直接使用
            if (runtimeApiUrl.startsWith('http://') || runtimeApiUrl.startsWith('https://')) {
                return runtimeApiUrl
            }
        }
    }

    // 开发环境使用 Vite 环境变量
    const viteApiUrl = import.meta.env.API_BASE_URL
    if (viteApiUrl) {
        return viteApiUrl
    }

    // 默认情况下使用相对路径（通过 nginx 代理）
    return ''
}

const API_BASE_URL = getApiBaseUrl()

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    // 不设置默认的 Content-Type，让每个请求自己决定
})

// Request interceptor to add auth token and logging
api.interceptors.request.use(
    (config: any) => {
        // 记录请求开始时间
        config.metadata = { startTime: Date.now() }

        // 如果不是 FormData，设置默认的 Content-Type
        if (!(config.data instanceof FormData)) {
            config.headers = config.headers || {}
            config.headers['Content-Type'] = 'application/json'
        }

        // 添加认证token
        const token = sessionStorage.getItem('token')
        if (token) {
            config.headers = config.headers || {}
            config.headers.Authorization = `Bearer ${token}`
        }

        // 使用新的日志系统记录请求
        httpLogger.logRequest(config)

        return config
    },
    (error: any) => {
        console.error('❌ Request Interceptor Error:', error)
        return Promise.reject(error)
    }
)

// Response interceptor for error handling and logging
api.interceptors.response.use(
    (response: any) => {
        // 计算请求耗时
        const duration = Date.now() - (response.config.metadata?.startTime || 0)

        // 更新统计信息
        requestStats.updateStats(duration, true)

        // 使用新的日志系统记录响应
        httpLogger.logResponse(response, duration)

        return response
    },
    (error: any) => {
        // 计算请求耗时
        const duration = Date.now() - (error.config?.metadata?.startTime || 0)

        // 更新统计信息
        requestStats.updateStats(duration, false)

        // 使用新的日志系统记录错误
        httpLogger.logError(error, duration)

        // 错误处理
        if (error.response?.status === 401) {
            // 清除所有认证相关的存储
            sessionStorage.removeItem('token')
            localStorage.removeItem('token')
            sessionStorage.clear()

            // 重定向到登录页
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'
                message.error('登录已过期，请重新登录')
            }
        } else if (error.response?.status >= 500) {
            message.error('服务器错误，请稍后重试')
        } else if (error.response?.status >= 400) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || '请求失败'
            message.error(errorMessage)
        } else if (error.code === 'ECONNABORTED') {
            message.error('请求超时，请检查网络连接')
        } else if (!error.response) {
            message.error('网络连接失败，请检查网络设置')
        }

        return Promise.reject(error)
    }
)

// 导出请求统计信息查看函数
export const getApiStats = () => {
    const stats = requestStats.getStats()
    console.group('📊 API Request Statistics')
    console.log('📈 Total Requests:', stats.totalRequests)
    console.log('✅ Successful:', stats.successfulRequests)
    console.log('❌ Failed:', stats.failedRequests)
    console.log('📊 Success Rate:', stats.successRate)
    console.log('⏱️ Average Response Time:', `${stats.averageResponseTime.toFixed(2)}ms`)
    console.groupEnd()
    return stats
}

// 在控制台暴露统计函数（仅开发环境）
if (import.meta.env.MODE === 'development') {
    (window as any).getApiStats = getApiStats
}

export default api