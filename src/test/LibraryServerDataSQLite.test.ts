import { LibraryServerDataSQLite } from '../lib/LibraryServerDataSQLite';
import * as path from 'path';
import * as fs from 'fs';

describe('LibraryServerDataSQLite', () => {
  let db: LibraryServerDataSQLite;
  const testDbPath = path.join(__dirname, 'test/test.db');

  beforeAll(async () => {
    // 确保测试数据库不存在
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    db = new LibraryServerDataSQLite({}, {
      id: 'test-library',
      customFields: {
        path: path.dirname(testDbPath),
        enableHash: false
      }
    });
    await db.initialize();
  });

  afterAll(async () => {
    await db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('file operations', () => {
    it('should create and get a file', async () => {
      const fileData = {
        name: 'test.txt',
        created_at: Date.now(),
        imported_at: Date.now(),
        size: 1024,
        hash: 'test-hash',
        custom_fields: '{}',
        notes: 'test notes',
        stars: 3,
        folder_id: null,
        reference: 'test-ref',
        path: '/path/to/test.txt',
        thumb: 0,
        recycled: 0,
        tags: '[]'
      };

      const createdFile = await db.createFile(fileData);
      expect(createdFile.id).toBeDefined();

      const retrievedFile = await db.getFile(createdFile.id);
      expect(retrievedFile).toEqual(createdFile);
    });

    it('should update a file', async () => {
      const fileData = {
        name: 'test-update.txt',
        created_at: Date.now(),
        imported_at: Date.now(),
        size: 2048,
        hash: 'test-hash-update',
        custom_fields: '{}',
        notes: 'test notes update',
        stars: 4,
        folder_id: null,
        reference: 'test-ref-update',
        path: '/path/to/test-update.txt',
        thumb: 1,
        recycled: 0,
        tags: '[]'
      };

      const createdFile = await db.createFile(fileData);
      const updated = await db.updateFile(createdFile.id, {
        name: 'updated-name.txt',
        stars: 5
      });
      expect(updated).toBe(true);

      const updatedFile = await db.getFile(createdFile.id);
      expect(updatedFile?.name).toBe('updated-name.txt');
      expect(updatedFile?.stars).toBe(5);
    });

    it('should delete a file', async () => {
      const fileData = {
        name: 'test-delete.txt',
        created_at: Date.now(),
        imported_at: Date.now(),
        size: 512,
        hash: 'test-hash-delete',
        custom_fields: '{}',
        notes: 'test notes delete',
        stars: 2,
        folder_id: null,
        reference: 'test-ref-delete',
        path: '/path/to/test-delete.txt',
        thumb: 0,
        recycled: 0,
        tags: '[]'
      };

      const createdFile = await db.createFile(fileData);
      const deleted = await db.deleteFile(createdFile.id);
      expect(deleted).toBe(true);

      const retrievedFile = await db.getFile(createdFile.id);
      expect(retrievedFile).toBeNull();
    });
  });

  describe('folder operations', () => {
    it('should create and get a folder', async () => {
      const folderData = {
        id: Date.now(), // 使用时间戳作为唯一ID
        title: 'Test Folder',
        parent_id: null,
        color: 0xFF0000,
        icon: 'folder'
      };

      const folderId = await db.createFolder(folderData);
      expect(folderId).toBe(folderData.id);

      const retrievedFolder = await db.getFolder(folderId);
      expect(retrievedFolder).toEqual({
        id: folderData.id,
        title: 'Test Folder',
        parent_id: null,
        color: 0xFF0000,
        icon: 'folder'
      });
    });
  });

  describe('tag operations', () => {
    it('should create and get a tag', async () => {
      const tagData = {
        id: Date.now(), // 使用时间戳作为唯一ID
        title: 'Test Tag',
        parent_id: null,
        color: 0x00FF00,
        icon: 1
      };

      const tagId = await db.createTag(tagData);
      expect(tagId).toBe(tagData.id);

      const retrievedTag = await db.getTag(tagId);
      expect(retrievedTag).toEqual({
        id: tagData.id,
        title: 'Test Tag',
        parent_id: null,
        color: 0x00FF00,
        icon: 1
      });
    });
  });
});