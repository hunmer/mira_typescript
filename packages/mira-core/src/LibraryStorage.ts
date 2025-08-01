import { LibraryServerDataSQLite } from "mira-storage-sqlite";
import { MiraBackend } from "./MiraBackend";
import { getLibrarysJson } from './LibraryList';
import { ServerPluginManager } from "./ServerPluginManager";
import { EventManager } from "./event-manager";

export class LibraryStorage {
  libraries: Record<string, {
    libraryService?: LibraryServerDataSQLite;
    pluginManager?: ServerPluginManager;
    eventManager?: EventManager;
  }> = {};

  backend: MiraBackend;

  constructor(backend: MiraBackend) {
    this.backend = backend;
  }

  async load(dbConfig: Record<string, any>): Promise<LibraryServerDataSQLite> {
    const libraryId = dbConfig.id;
    const dbServer = new LibraryServerDataSQLite(dbConfig, { webSocketServer: this.backend.webSocketServer, httpServer: this.backend.httpServer });
    this.libraries[libraryId] = {
      libraryService: dbServer,
      eventManager: new EventManager()
    }
    await dbServer.initialize();
    const pluginManager = new ServerPluginManager(
      { server: this.backend.webSocketServer, dbService: dbServer, httpServer: this.backend.httpServer, pluginsDir: dbConfig.pluginsDir }
    );
    this.libraries[libraryId].pluginManager = pluginManager;
    await pluginManager.loadPlugins();
    return dbServer;
  }

  async loadAll(): Promise<number> {
    let success = 0;
    for (const library of await getLibrarysJson(this.backend.dataPath)) {
      try {
        console.log('loading library ', library.name);
        await this.load(library);
        success++;
      } catch (err) {
        console.log(err)
      }
    }
    return success;
  }

  clear() {
    Object.values(this.libraries).forEach(lib => lib.libraryService!.close());
    this.libraries = {};
  }

  get(libraryId: string): Record<string, any> | undefined {
    return this.libraries[libraryId];;
  }

  exists(libraryId: string): boolean {
    return libraryId in this.libraries;
  }

}