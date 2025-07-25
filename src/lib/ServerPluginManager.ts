
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
    private pluginsDir: string;
    private server: MiraWebsocketServer;
    private dbService: ILibraryServerData;
    private pluginsConfigPath: string;
    private loadedPlugins: Map<string, any> = new Map();

    constructor(server: MiraWebsocketServer, dbService: ILibraryServerData, pluginsDir: string = path.join(__dirname, 'plugins')) {
        this.pluginsDir = pluginsDir;
        this.server = server;
        this.dbService = dbService;
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

    async loadPlugins(): Promise<void> {
        const config: PluginConfig[] = JSON.parse(
            fs.readFileSync(this.pluginsConfigPath, 'utf-8')
        );

        for (const pluginConfig of config) {
            if (pluginConfig.enabled) {
                try {
                    const pluginPath = path.join(this.pluginsDir, pluginConfig.path);
                    const pluginModule = await import(pluginPath);
                    if (typeof pluginModule.init === 'function') {
                        await pluginModule.init(this.server, this.dbService);
                    }
                    this.loadedPlugins.set(pluginConfig.name, pluginModule);
                    console.log(`Loaded plugin: ${pluginConfig.name}`);
                } catch (err) {
                    console.error(`Failed to load plugin ${pluginConfig.name}:`, err);
                }
            }
        }
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