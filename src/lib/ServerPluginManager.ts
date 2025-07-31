
import { MiraHttpServer } from './HttpServer';
import { ILibraryServerData } from './ILibraryServerData';
import { MiraWebsocketServer } from './WebSocketServer';
import * as fs from 'fs';
import * as path from 'path';

export interface PluginConfig {
    name: string;
    enabled: boolean;
    path: string;
}

export class ServerPluginManager {
     pluginsDir: string;
    private server: MiraWebsocketServer;
    private httpServer: MiraHttpServer;
    private dbService: ILibraryServerData;
    private pluginsConfigPath: string;
    private loadedPlugins: Map<string, any> = new Map();
    fields: Record<string, any>[] = [];

    constructor({server, dbService, httpServer, pluginsDir}: {server: MiraWebsocketServer, dbService: ILibraryServerData, httpServer: MiraHttpServer, pluginsDir?: string}) {
        this.pluginsDir = pluginsDir || path.join(__dirname, 'plugins');
        this.server = server;
        this.dbService = dbService;
        this.httpServer = httpServer;
        this.pluginsConfigPath = path.join(this.pluginsDir, 'plugins.json');
        
        // Ensure plugins directory exists
        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirSync(this.pluginsDir, { recursive: true });
        }
        
        // Initialize plugins.json if it doesn't exist
        if (!fs.existsSync(this.pluginsConfigPath)) {
            fs.writeFileSync(this.pluginsConfigPath, JSON.stringify([], null, 2));
        }
    }

    // getPluginDir
    getPluginDir(pluginName: string): string {
        return path.join(this.pluginsDir, pluginName);
    }

    async loadPlugins(): Promise<void> {
        const config: PluginConfig[] = JSON.parse(
            fs.readFileSync(this.pluginsConfigPath, 'utf-8')
        );

        for (const pluginConfig of config) {
            if (pluginConfig.enabled) {
                try {
                    const pluginPath = path.join(this.pluginsDir, pluginConfig.path);
                    delete require.cache[require.resolve(pluginPath)];
                    const pluginModule = require(pluginPath);
                    if (typeof pluginModule.init === 'function') {
                        await pluginModule.init(
                        {pluginManager: this, server: this.server, dbService: this.dbService, httpServer: this.httpServer})
                    }
                    this.loadedPlugins.set(pluginConfig.name, pluginModule);
                    console.log(`Loaded plugin: ${pluginConfig.name}`);
                } catch (err) {
                    console.error(`Failed to load plugin ${pluginConfig.name}:`, err);
                }
            }
        }
    }

    registerFields(fields: Record<string, any>[]): void {
        for (const field of fields) {
            this.registerField(field);
        }
    }

    registerField(field: Record<string, any>): void {
        let {action, type, field: fieldName} = field;
        if(!fieldName || !action || !type) {
            throw new Error('Field registration error: action, type, and field are required');
        }
        this.fields.push(field);
    }

    getPlugin<T>(name: string): T | undefined {
        return this.loadedPlugins.get(name);
    }

    async addPlugin(config: PluginConfig): Promise<void> {
        const currentConfig: PluginConfig[] = JSON.parse(
            fs.readFileSync(this.pluginsConfigPath, 'utf-8')
        );
        
        const existingIndex = currentConfig.findIndex(p => p.name === config.name);
        if (existingIndex >= 0) {
            currentConfig[existingIndex] = config;
        } else {
            currentConfig.push(config);
        }
        
        fs.writeFileSync(this.pluginsConfigPath, JSON.stringify(currentConfig, null, 2));
        
        if (config.enabled) {
            await this.loadPlugins();
        }
    }
}