import { MiraHttpServer } from "./HttpServer";
import { LibraryServerDataSQLite } from "./LibraryServerDataSQLite";
import { MiraBackend } from "./ServerExample";
import { MiraWebsocketServer } from "./WebSocketServer";

export class LibraryStorage {
   libraryServices: LibraryServerDataSQLite[] = [];
   backend: MiraBackend;

   constructor(backend: MiraBackend){
    this.backend = backend;
   }

   all(): LibraryServerDataSQLite[] {
    return this.libraryServices;
   }

  async load(dbConfig: Record<string, any>): Promise<LibraryServerDataSQLite> {
    const dbServer = new LibraryServerDataSQLite(this.backend.webSocketServer, this.backend.httpServer, dbConfig);
    await dbServer.initialize();
    this.libraryServices.push(dbServer);
    return dbServer;
  }

   get(libraryId: string): LibraryServerDataSQLite | undefined {
    return this.libraryServices.find(
      (library) => library.getLibraryId() === libraryId
    );
  }

  exists(libraryId: string): boolean {
    return this.libraryServices.some(
      (library) => library.getLibraryId() === libraryId
    );
  }

  find(libraryId: string): LibraryServerDataSQLite | undefined {
    return this.libraryServices.find((library) => library.getLibraryId() === libraryId);
  }


}