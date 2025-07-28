import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export abstract class ServerPlugin {
    protected configs: Record<string, any> = {};
    protected readonly eventEmitter: EventEmitter;
    protected readonly pluginDir: string;
    protected readonly pluginDataDir: string;

    constructor(protected readonly pluginName: string, eventEmitter: EventEmitter) {
        this.eventEmitter = eventEmitter;
        this.pluginDir = path.join(__dirname, 'plugins', 'plugins',pluginName);
        this.pluginDataDir = path.join(__dirname, 'plugins', 'data', pluginName);
        this.ensureDirExists();
    }

    private ensureDirExists() {
        if (!fs.existsSync(this.pluginDataDir)) {
            fs.mkdirSync(this.pluginDataDir, { recursive: true });
        }
    }

    protected writeConfig(key: string, value: any) {
        this.configs[key] = value;
    }

    protected readConfig(key: string): any {
        return this.configs[key];
    }

    protected loadConfig(config: Record<string, any>) {
        this.configs = { ...this.configs, ...config };
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