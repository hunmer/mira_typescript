export interface Library {
    id: string
    name: string
    path: string
    description?: string
    type: 'local' | 'remote'
    status: 'active' | 'inactive'
    fileCount: number
    size: number
    createdAt: string
    updatedAt: string
}

export interface Plugin {
    id: string
    name: string
    version: string
    description?: string
    author: string
    status: 'active' | 'inactive'
    configurable: boolean
    dependencies: string[]
    main: string
    createdAt: string
    updatedAt: string
    icon?: string | null
    category?: string
    tags?: string[]
    libraryId?: string
    libraryName?: string
}

export interface DatabaseTable {
    name: string
    schema: string
    rowCount: number
}

export interface DatabaseRow {
    [key: string]: any
}
