import axios, { AxiosInstance } from 'axios';
import { TestConfig, defaultConfig } from './test-config';

export class HttpLibraryTest {
  private readonly client: AxiosInstance;
  private readonly config: TestConfig;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async connectLibrary() {
    try {
      const response = await this.client.post('/library/connect', {
        libraryId: this.config.libraryId,
        library: this.config.libraryConfig
      });
      console.log('Library connected:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to connect library:', error);
      throw error;
    }
  }

  async testFolderOperations() {
    // Create folder
    const createRes = await this.client.post(`/library/${this.config.libraryId}/folders`, {
      name: 'Test Folder'
    });
    console.log('Folder created:', createRes.data);

    // Get folders
    const listRes = await this.client.get(`/library/${this.config.libraryId}/folders`);
    console.log('Folders:', listRes.data);

    // Update folder
    const folderId = createRes.data.id;
    const updateRes = await this.client.put(
      `/library/${this.config.libraryId}/folders/${folderId}`,
      { name: 'Updated Folder' }
    );
    console.log('Folder updated:', updateRes.data);

    // Delete folder
    const deleteRes = await this.client.delete(
      `/library/${this.config.libraryId}/folders/${folderId}`
    );
    console.log('Folder deleted:', deleteRes.data);
  }

  async testFileOperations() {
    // Create file
    const createRes = await this.client.post(`/library/${this.config.libraryId}/files`, {
      path: '/test/path',
      reference: 'test-reference'
    });
    console.log('File created:', createRes.data);

    // Get files
    const listRes = await this.client.get(`/library/${this.config.libraryId}/files`);
    console.log('Files:', listRes.data);

    // Get single file
    const fileId = createRes.data.id;
    const getRes = await this.client.get(
      `/library/${this.config.libraryId}/files/${fileId}`
    );
    console.log('File details:', getRes.data);

    // Update file
    const updateRes = await this.client.put(
      `/library/${this.config.libraryId}/files/${fileId}`,
      { tags: ['test'] }
    );
    console.log('File updated:', updateRes.data);

    // Delete file
    const deleteRes = await this.client.delete(
      `/library/${this.config.libraryId}/files/${fileId}`
    );
    console.log('File deleted:', deleteRes.data);
  }

  async testTagOperations() {
    // Create tag
    const createRes = await this.client.post(`/library/${this.config.libraryId}/tags`, {
      name: 'Test Tag'
    });
    console.log('Tag created:', createRes.data);

    // Get tags
    const listRes = await this.client.get(`/library/${this.config.libraryId}/tags`);
    console.log('Tags:', listRes.data);

    // Update tag
    const tagId = createRes.data.id;
    const updateRes = await this.client.put(
      `/library/${this.config.libraryId}/tags/${tagId}`,
      { name: 'Updated Tag' }
    );
    console.log('Tag updated:', updateRes.data);

    // Delete tag
    const deleteRes = await this.client.delete(
      `/library/${this.config.libraryId}/tags/${tagId}`
    );
    console.log('Tag deleted:', deleteRes.data);
  }

  async runAllTests() {
    try {
      await this.connectLibrary();
      await this.testFolderOperations();
      await this.testFileOperations();
      await this.testTagOperations();
      console.log('All tests completed successfully');
    } catch (error) {
      console.error('Test failed:', error);
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new HttpLibraryTest();
  tester.runAllTests();
}