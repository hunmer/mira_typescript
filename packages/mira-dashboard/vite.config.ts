import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
    // 加载环境变量
    const env = loadEnv(mode, process.cwd(), '')

    // 处理 Docker 环境下无法访问 vite 变量的问题
    const API_BASE_URL = env.API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:8081'
    const APP_PORT = parseInt(env.APP_PORT || process.env.APP_PORT || '3999')

    return {
        plugins: [vue()],
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
            },
        },
        server: {
            port: APP_PORT,
            proxy: {
                '/api': {
                    target: API_BASE_URL,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, '')
                }
            }
        },
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            sourcemap: false,
        }
    }
})
