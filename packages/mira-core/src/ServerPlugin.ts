import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { ServerPluginManager } from './ServerPluginManager';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { EventManager } from './event-manager';
import { MiraWebsocketServer } from './WebSocketServer';
import { MiraBackend } from './MiraBackend';

export abstract class ServerPlugin {
    protected configs: Record<string, any> = {};
    protected readonly pluginDir: string;
    protected readonly pluginDataDir: string;

    constructor(protected readonly pluginName: string, pluginManager: ServerPluginManager, dbServer: ILibraryServerData) {
        this.pluginDir = pluginManager.getPluginDir(pluginName);
        this.pluginDataDir = path.join(this.pluginDir, 'data');
        this.ensureDirExists();
    }

    private ensureDirExists() {
        if (!fs.existsSync(this.pluginDataDir)) {
            fs.mkdirSync(this.pluginDataDir, { recursive: true });
        }
    }

    protected writeConfig(key: string, value: any) {
        this.configs[key] = value;
        this.saveConfig();
    }

    protected saveConfig() {
        return this.writeJson('config.json', this.configs);
    }

    protected readConfig(key: string): any {
        return this.configs[key];
    }

    protected loadConfig(defaultConfig: Record<string, any> = {}) {
        const config = this.readJson('config.json');
        this.configs = { ...defaultConfig, ...config || {} };
        if (config == null) {
            this.saveConfig();
        }
    }

    protected writeJson(filename: string, data: any) {
        const filePath = path.join(this.pluginDataDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    protected readJson(filename: string): any {
        const filePath = path.join(this.pluginDataDir, filename);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
        return null;
    }
}