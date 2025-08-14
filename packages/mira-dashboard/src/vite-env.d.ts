/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

interface ImportMetaEnv {
    readonly APP_TITLE: string
    readonly API_BASE_URL: string
    readonly INITIAL_ADMIN_USERNAME: string
    readonly INITIAL_ADMIN_PASSWORD: string
    readonly INITIAL_ADMIN_EMAIL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
