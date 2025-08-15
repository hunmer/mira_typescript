import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/Login.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/',
        name: 'Dashboard',
        component: () => import('@/layouts/DashboardLayout.vue'),
        meta: { requiresAuth: true },
        redirect: '/overview',
        children: [
            {
                path: '/overview',
                name: 'Overview',
                component: () => import('@/views/Overview.vue'),
                meta: { title: '概览' }
            },
            {
                path: '/libraries',
                name: 'Libraries',
                component: () => import('@/views/LibraryManager.vue'),
                meta: { title: '资源库管理器' }
            },
            {
                path: '/plugins',
                name: 'Plugins',
                component: () => import('@/views/PluginManager.vue'),
                meta: { title: '插件管理器' }
            },
            {
                path: '/admins',
                name: 'Admins',
                component: () => import('@/views/AdminManager.vue'),
                meta: { title: '管理员管理' }
            },
            {
                path: '/database',
                name: 'Database',
                component: () => import('@/views/DatabaseViewer.vue'),
                meta: { title: 'SQLite数据库预览' }
            },
            {
                path: '/devices',
                name: 'Devices',
                component: () => import('@/views/DeviceManager.vue'),
                meta: { title: '设备管理' }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Navigation guard for authentication
router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore()

    // 如果目标路由需要认证
    if (to.meta.requiresAuth !== false && to.path !== '/login') {
        if (!authStore.isAuthenticated) {
            console.log('User not authenticated, redirecting to login')
            next('/login')
            return
        }

        // 如果有token但没有用户信息，尝试初始化
        if (authStore.token && !authStore.user) {
            try {
                await authStore.initializeAuth()
            } catch (error) {
                console.error('Auth initialization failed:', error)
                next('/login')
                return
            }
        }
    }

    // 如果用户已登录但访问登录页，重定向到首页
    if (to.path === '/login' && authStore.isAuthenticated) {
        console.log('User already authenticated, redirecting to dashboard')
        next('/')
        return
    }

    next()
})

export default router
