import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
    // 加载环境变量
    const env = loadEnv(mode, process.cwd(), '')

    return {
        plugins: [vue()],
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
            },
        },
        server: {
            port: parseInt(env.APP_PORT) || 3000,
            proxy: {
                '/api': {
                    target: env.API_BASE_URL || 'http://localhost:8081',
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
