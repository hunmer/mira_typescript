import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LoginForm, User } from '@/types/auth'
import { api } from '@/utils/api'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(sessionStorage.getItem('token'))

    const isAuthenticated = computed(() => !!token.value)

    const login = async (loginForm: LoginForm) => {
        try {
            const response = await api.post('/auth/login', loginForm)
            const data = response.data as any

            if (data.success) {
                token.value = data.data.token
                user.value = data.data.user
                // 使用 sessionStorage 而非 localStorage，会话结束后自动清除
                sessionStorage.setItem('token', token.value || '')
                return { success: true }
            } else {
                return {
                    success: false,
                    message: data.message || '登录失败'
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || '登录失败'
            }
        }
    }

    const logout = async () => {
        try {
            // 调用后端logout API
            if (token.value) {
                await api.post('/auth/logout')
            }
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            // 无论后端调用是否成功，都清除本地状态
            token.value = null
            user.value = null
            sessionStorage.removeItem('token')
            // 清除所有可能的本地存储数据
            sessionStorage.clear()
            localStorage.removeItem('token')
        }
    }

    const initializeAuth = async () => {
        if (token.value) {
            try {
                const response = await api.get('/auth/profile')
                const data = response.data as any
                if (data.success) {
                    user.value = data.data.user
                } else {
                    logout()
                }
            } catch (error) {
                logout()
            }
        }
    }

    return {
        user,
        token,
        isAuthenticated,
        login,
        logout,
        initializeAuth
    }
})
