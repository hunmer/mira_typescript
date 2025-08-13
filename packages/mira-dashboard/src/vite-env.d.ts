/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

interface ImportMetaEnv {
    readonly VITE_APP_TITLE: string
    readonly VITE_API_BASE_URL: string
    readonly VITE_INITIAL_ADMIN_USERNAME: string
    readonly VITE_INITIAL_ADMIN_PASSWORD: string
    readonly VITE_INITIAL_ADMIN_EMAIL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
