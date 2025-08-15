import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/utils/api'
import type { Library } from '@/types'

export interface DeviceInfo {
    clientId: string
    libraryId: string
    connectionTime: string
    lastActivity: string
    requestInfo: {
        url?: string
        headers: any
        remoteAddress?: string
    }
    status: 'connected' | 'disconnected'
    userAgent?: string
    ipAddress?: string
}

export interface DeviceStats {
    totalLibraries: number
    totalConnections: number
    libraryStats: Record<string, {
        connectionCount: number
        activeConnections: number
    }>
}

export const useDeviceStore = defineStore('device', () => {
    const devices = ref<Record<string, DeviceInfo[]>>({})
    const stats = ref<DeviceStats | null>(null)
    const libraries = ref<Library[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // 计算属性
    const totalConnections = computed(() => {
        return Object.values(devices.value).reduce((total, deviceList) => total + deviceList.length, 0)
    })

    const activeConnections = computed(() => {
        return Object.values(devices.value).reduce((total, deviceList) => {
            return total + deviceList.filter(device => device.status === 'connected').length
        }, 0)
    })

    const libraryCount = computed(() => {
        return Object.keys(devices.value).length
    })

    // 获取所有设备信息
    const fetchAllDevices = async () => {
        loading.value = true
        error.value = null
        try {
            const response = await api.get('/api/devices')
            const data = response.data as any
            if (data.success) {
                devices.value = data.data
            } else {
                error.value = data.error || '获取设备信息失败'
            }
        } catch (err: any) {
            error.value = err.response?.data?.error || '获取设备信息失败'
            console.error('Failed to fetch devices:', err)
        } finally {
            loading.value = false
        }
    }

    // 获取特定素材库的设备信息
    const fetchLibraryDevices = async (libraryId: string) => {
        loading.value = true
        error.value = null
        try {
            const response = await api.get(`/api/devices/library/${libraryId}`)
            const data = response.data as any
            if (data.success) {
                devices.value = {
                    ...devices.value,
                    [libraryId]: data.data
                }
            } else {
                error.value = data.error || '获取素材库设备信息失败'
            }
        } catch (err: any) {
            error.value = err.response?.data?.error || '获取素材库设备信息失败'
            console.error('Failed to fetch library devices:', err)
        } finally {
            loading.value = false
        }
    }

    // 断开设备连接
    const disconnectDevice = async (libraryId: string, clientId: string) => {
        try {
            const response = await api.post('/api/devices/disconnect', {
                libraryId,
                clientId
            })
            const data = response.data as any
            if (data.success) {
                // 从本地状态中移除该设备
                if (devices.value[libraryId]) {
                    devices.value[libraryId] = devices.value[libraryId].filter(
                        device => device.clientId !== clientId
                    )
                }
                return { success: true, message: '设备已断开连接' }
            } else {
                return { success: false, message: data.error || '断开连接失败' }
            }
        } catch (err: any) {
            const message = err.response?.data?.error || '断开连接失败'
            console.error('Failed to disconnect device:', err)
            return { success: false, message }
        }
    }

    // 向设备发送消息
    const sendMessageToDevice = async (libraryId: string, clientId: string, message: string) => {
        try {
            const response = await api.post('/api/devices/send-message', {
                libraryId,
                clientId,
                message
            })
            const data = response.data as any
            if (data.success) {
                return { success: true, message: '消息发送成功' }
            } else {
                return { success: false, message: data.error || '消息发送失败' }
            }
        } catch (err: any) {
            const message = err.response?.data?.error || '消息发送失败'
            console.error('Failed to send message to device:', err)
            return { success: false, message }
        }
    }

    // 获取设备统计信息
    const fetchDeviceStats = async () => {
        try {
            const response = await api.get('/api/devices/stats')
            const data = response.data as any
            if (data.success) {
                stats.value = data.data
            } else {
                error.value = data.error || '获取统计信息失败'
            }
        } catch (err: any) {
            error.value = err.response?.data?.error || '获取统计信息失败'
            console.error('Failed to fetch device stats:', err)
        }
    }

    // 获取素材库列表
    const fetchLibraries = async () => {
        try {
            const response = await api.get('/api/libraries')
            const data = response.data as any
            libraries.value = Array.isArray(data) ? data : []
        } catch (err: any) {
            console.error('Failed to fetch libraries:', err)
        }
    }

    // 按素材库分组的设备信息
    const getDevicesByLibrary = (libraryId: string): DeviceInfo[] => {
        return devices.value[libraryId] || []
    }

    // 获取素材库连接状态
    const getLibraryConnectionStatus = (libraryId: string) => {
        const libraryDevices = devices.value[libraryId] || []
        const total = libraryDevices.length
        const active = libraryDevices.filter(device => device.status === 'connected').length
        return { total, active }
    }

    // 获取库名称
    const getLibraryName = (libraryId: string): string => {
        const library = libraries.value.find(lib => lib.id === libraryId)
        return library ? library.name : libraryId
    }

    // 清除错误
    const clearError = () => {
        error.value = null
    }

    // 重置状态
    const reset = () => {
        devices.value = {}
        stats.value = null
        error.value = null
        loading.value = false
    }

    return {
        // 状态
        devices,
        stats,
        libraries,
        loading,
        error,

        // 计算属性
        totalConnections,
        activeConnections,
        libraryCount,

        // 方法
        fetchAllDevices,
        fetchLibraryDevices,
        fetchLibraries,
        disconnectDevice,
        sendMessageToDevice,
        fetchDeviceStats,
        getDevicesByLibrary,
        getLibraryConnectionStatus,
        getLibraryName,
        clearError,
        reset
    }
})
