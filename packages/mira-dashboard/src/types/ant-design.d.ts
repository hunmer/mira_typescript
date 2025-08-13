declare module 'ant-design-vue' {
    import { App } from 'vue'

    export interface FormInstance {
        validate(): Promise<void>
        resetFields(): void
    }

    export interface MessageApi {
        success(content: string): void
        error(content: string): void
        warning(content: string): void
        info(content: string): void
    }

    export interface ModalApi {
        confirm(config: {
            title: string
            content: string
            okText?: string
            cancelText?: string
        }): Promise<void>
    }

    export const message: MessageApi
    export const Modal: ModalApi

    const Antd: {
        install(app: App): void
    }

    export default Antd
}

declare module '@ant-design/icons-vue' {
    import { Component } from 'vue'

    export const UserOutlined: Component
    export const LockOutlined: Component
    export const PlusOutlined: Component
    export const SearchOutlined: Component
    export const FolderOutlined: Component
    export const AppstoreOutlined: Component
    export const DatabaseOutlined: Component
    export const HomeOutlined: Component
    export const DownOutlined: Component
    export const MonitorOutlined: Component
    export const ClockCircleOutlined: Component
    export const InfoCircleOutlined: Component
    export const ReloadOutlined: Component
    export const EditOutlined: Component
    export const DownloadOutlined: Component
    export const UploadOutlined: Component

    const Icons: Record<string, Component>
    export default Icons
}
