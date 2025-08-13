export interface User {
    id: string
    username: string
    email: string
    role: 'admin' | 'user'
    createdAt: string
    updatedAt: string
}

export interface LoginForm {
    username: string
    password: string
}

export interface CreateAdminForm {
    username: string
    email: string
    password: string
    confirmPassword: string
}
