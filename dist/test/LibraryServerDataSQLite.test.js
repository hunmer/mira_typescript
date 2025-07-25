"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const LibraryServerDataSQLite_1 = require("./LibraryServerDataSQLite");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
describe('LibraryServerDataSQLite', () => {
    let db;
    const testDbPath = path.join(__dirname, 'test/test.db');
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // 确保测试数据库不存在
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        db = new LibraryServerDataSQLite_1.LibraryServerDataSQLite({}, {
            id: 'test-library',
            customFields: {
                path: path.dirname(testDbPath),
                enableHash: false
            }
        });
        yield db.initialize();
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield db.close();
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    }));
    describe('file operations', () => {
        it('should create and get a file', () => __awaiter(void 0, void 0, void 0, function* () {
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
            const createdFile = yield db.createFile(fileData);
            expect(createdFile.id).toBeDefined();
            const retrievedFile = yield db.getFile(createdFile.id);
            expect(retrievedFile).toEqual(createdFile);
        }));
        it('should update a file', () => __awaiter(void 0, void 0, void 0, function* () {
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
            const createdFile = yield db.createFile(fileData);
            const updated = yield db.updateFile(createdFile.id, {
                name: 'updated-name.txt',
                stars: 5
            });
            expect(updated).toBe(true);
            const updatedFile = yield db.getFile(createdFile.id);
            expect(updatedFile === null || updatedFile === void 0 ? void 0 : updatedFile.name).toBe('updated-name.txt');
            expect(updatedFile === null || updatedFile === void 0 ? void 0 : updatedFile.stars).toBe(5);
        }));
        it('should delete a file', () => __awaiter(void 0, void 0, void 0, function* () {
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
            const createdFile = yield db.createFile(fileData);
            const deleted = yield db.deleteFile(createdFile.id);
            expect(deleted).toBe(true);
            const retrievedFile = yield db.getFile(createdFile.id);
            expect(retrievedFile).toBeNull();
        }));
    });
    describe('folder operations', () => {
        it('should create and get a folder', () => __awaiter(void 0, void 0, void 0, function* () {
            const folderData = {
                id: Date.now(), // 使用时间戳作为唯一ID
                title: 'Test Folder',
                parent_id: null,
                color: 0xFF0000,
                icon: 'folder'
            };
            const folderId = yield db.createFolder(folderData);
            expect(folderId).toBe(folderData.id);
            const retrievedFolder = yield db.getFolder(folderId);
            expect(retrievedFolder).toEqual({
                id: folderData.id,
                title: 'Test Folder',
                parent_id: null,
                color: 0xFF0000,
                icon: 'folder'
            });
        }));
    });
    describe('tag operations', () => {
        it('should create and get a tag', () => __awaiter(void 0, void 0, void 0, function* () {
            const tagData = {
                id: Date.now(), // 使用时间戳作为唯一ID
                title: 'Test Tag',
                parent_id: null,
                color: 0x00FF00,
                icon: 1
            };
            const tagId = yield db.createTag(tagData);
            expect(tagId).toBe(tagData.id);
            const retrievedTag = yield db.getTag(tagId);
            expect(retrievedTag).toEqual({
                id: tagData.id,
                title: 'Test Tag',
                parent_id: null,
                color: 0x00FF00,
                icon: 1
            });
        }));
    });
});
