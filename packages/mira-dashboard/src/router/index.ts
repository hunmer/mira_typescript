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
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Navigation guard for authentication
router.beforeEach((to, _, next) => {
    const authStore = useAuthStore()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        next('/login')
    } else if (to.path === '/login' && authStore.isAuthenticated) {
        next('/')
    } else {
        next()
    }
})

export default router
