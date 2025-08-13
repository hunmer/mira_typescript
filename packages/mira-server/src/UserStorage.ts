import { Database } from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// 用户接口定义
export interface User {
    id: number;
    username: string;
    password: string; // 哈希后的密码
    role: string;
    permissions: string[];
    created_at: number;
    updated_at: number;
    is_active: boolean;
}

// 会话接口定义
export interface Session {
    token: string;
    user_id: number;
    created_at: number;
    expires_at: number;
    is_active: boolean;
}

export class UserStorage {
    private db: Database | null = null;
    private dbPath: string;

    constructor(dataDir: string = './data') {
        // 确保数据目录存在
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        this.dbPath = path.join(dataDir, 'users.db');
    }

    async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db = new Database(this.dbPath, async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    await this.createTables();
                    await this.createDefaultAdmin();
                    console.log('✅ 用户数据库初始化完成');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    private async createTables(): Promise<void> {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                permissions TEXT NOT NULL DEFAULT '[]',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1
            )
        `;

        const createSessionsTable = `
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;

        await this.executeSql(createUsersTable);
        await this.executeSql(createSessionsTable);

        // 创建索引以提高查询性能
        await this.executeSql('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
        await this.executeSql('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
        await this.executeSql('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
    }

    private async createDefaultAdmin(): Promise<void> {
        const adminUsername = process.env.VITE_INITIAL_ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.VITE_INITIAL_ADMIN_PASSWORD || 'admin123';

        // 检查是否已存在管理员用户
        const existingAdmin = await this.findUserByUsername(adminUsername);
        if (existingAdmin) {
            console.log(`📝 管理员用户 '${adminUsername}' 已存在`);
            return;
        }

        // 创建默认管理员用户
        const hashedPassword = this.hashPassword(adminPassword);
        const now = Date.now();

        const admin: Omit<User, 'id'> = {
            username: adminUsername,
            password: hashedPassword,
            role: 'administrator',
            permissions: ['*'],
            created_at: now,
            updated_at: now,
            is_active: true
        };

        const adminId = await this.createUser(admin);
        console.log(`✅ 默认管理员用户创建成功: ${adminUsername} (ID: ${adminId})`);
        console.log(`🔑 初始密码: ${adminPassword}`);
    }

    // 密码哈希
    private hashPassword(password: string): string {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }

    // 验证密码
    private verifyPassword(password: string, hashedPassword: string): boolean {
        const [salt, hash] = hashedPassword.split(':');
        const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }

    // 生成令牌
    generateToken(userId: number): string {
        const randomBytes = crypto.randomBytes(32).toString('hex');
        return `mira-token-${userId}-${Date.now()}-${randomBytes}`;
    }

    // 用户操作方法
    async createUser(userData: Omit<User, 'id'>): Promise<number> {
        const query = `
            INSERT INTO users (username, password, role, permissions, created_at, updated_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            userData.username,
            userData.password,
            userData.role,
            JSON.stringify(userData.permissions),
            userData.created_at,
            userData.updated_at,
            userData.is_active ? 1 : 0
        ];

        const result = await this.runSql(query, params);
        return result.lastID;
    }

    async findUserByUsername(username: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE username = ? AND is_active = 1 LIMIT 1';
        const rows = await this.getSql(query, [username]);

        if (rows.length === 0) {
            return null;
        }

        return this.rowToUser(rows[0]);
    }

    async findUserById(id: number): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE id = ? AND is_active = 1 LIMIT 1';
        const rows = await this.getSql(query, [id]);

        if (rows.length === 0) {
            return null;
        }

        return this.rowToUser(rows[0]);
    }

    async authenticateUser(username: string, password: string): Promise<User | null> {
        const user = await this.findUserByUsername(username);
        if (!user) {
            return null;
        }

        if (this.verifyPassword(password, user.password)) {
            return user;
        }

        return null;
    }

    // 会话管理方法
    async createSession(userId: number, tokenLifetime: number = 24 * 60 * 60 * 1000): Promise<string> {
        const token = this.generateToken(userId);
        const now = Date.now();
        const expiresAt = now + tokenLifetime;

        const query = `
            INSERT INTO sessions (token, user_id, created_at, expires_at, is_active)
            VALUES (?, ?, ?, ?, 1)
        `;

        await this.runSql(query, [token, userId, now, expiresAt]);
        return token;
    }

    async validateSession(token: string): Promise<User | null> {
        const query = `
            SELECT s.*, u.* FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.is_active = 1 AND s.expires_at > ? AND u.is_active = 1
            LIMIT 1
        `;

        const rows = await this.getSql(query, [token, Date.now()]);

        if (rows.length === 0) {
            return null;
        }

        return this.rowToUser(rows[0]);
    }

    async revokeSession(token: string): Promise<boolean> {
        const query = 'UPDATE sessions SET is_active = 0 WHERE token = ?';
        const result = await this.runSql(query, [token]);
        return result.changes > 0;
    }

    async revokeAllUserSessions(userId: number): Promise<boolean> {
        const query = 'UPDATE sessions SET is_active = 0 WHERE user_id = ?';
        const result = await this.runSql(query, [userId]);
        return result.changes > 0;
    }

    // 清理过期会话
    async cleanupExpiredSessions(): Promise<number> {
        const query = 'DELETE FROM sessions WHERE expires_at < ? OR is_active = 0';
        const result = await this.runSql(query, [Date.now()]);
        return result.changes;
    }

    // 工具方法
    private rowToUser(row: any): User {
        return {
            id: row.id,
            username: row.username,
            password: row.password,
            role: row.role,
            permissions: JSON.parse(row.permissions || '[]'),
            created_at: row.created_at,
            updated_at: row.updated_at,
            is_active: Boolean(row.is_active)
        };
    }

    // 获取用户信息（不包含密码）
    getUserInfo(user: User) {
        const { password, ...userInfo } = user;
        return userInfo;
    }

    // 获取所有用户
    async getAllUsers(): Promise<User[]> {
        const rows = await this.getSql('SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC');
        return rows.map(row => this.rowToUser(row));
    }

    // 数据库操作工具方法
    private executeSql(sql: string, params?: any[]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            this.db.run(sql, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private runSql(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            this.db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    private getSql(sql: string, params?: any[]): Promise<any[]> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async close(): Promise<void> {
        if (this.db) {
            return new Promise((resolve) => {
                this.db!.close(() => {
                    this.db = null;
                    resolve();
                });
            });
        }
    }
}
