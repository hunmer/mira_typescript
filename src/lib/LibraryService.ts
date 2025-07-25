import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';

export class LibraryService {
  private dbService: LibraryServerDataSQLite;

  constructor(dbService: LibraryServerDataSQLite) {
    this.dbService = dbService;
  }

  async connectLibrary(config: Record<string, any>): Promise<Record<string, any>> {
    const tags = await this.dbService.getAllTags();
    const folders = await this.dbService.getAllFolders();
    return {
      libraryId: this.dbService.getLibraryId(),
      status: 'connected',
      tags, folders,
      config
    };
  }
}