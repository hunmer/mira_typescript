export interface TestConfig {
  baseURL: string;
  libraryId: string;
  libraryConfig: Record<string, unknown>;
}

export const defaultConfig: TestConfig = {
  baseURL: 'http://localhost:8081',
  libraryId: 'test-library',
  libraryConfig: {
    // Add your default library configuration here
    database: ':memory:',
    storagePath: './test-storage'
  }
};