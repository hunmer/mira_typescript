"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpLibraryTest = void 0;
const axios_1 = __importDefault(require("axios"));
const test_config_1 = require("./test-config");
class HttpLibraryTest {
    constructor(config = {}) {
        this.config = Object.assign(Object.assign({}, test_config_1.defaultConfig), config);
        this.client = axios_1.default.create({
            baseURL: this.config.baseURL,
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    connectLibrary() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.client.post('/library/connect', {
                    libraryId: this.config.libraryId,
                    library: this.config.libraryConfig
                });
                console.log('Library connected:', response.data);
                return response.data;
            }
            catch (error) {
                console.error('Failed to connect library:', error);
                throw error;
            }
        });
    }
    testFolderOperations() {
        return __awaiter(this, void 0, void 0, function* () {
            // Create folder
            const createRes = yield this.client.post(`/library/${this.config.libraryId}/folders`, {
                name: 'Test Folder'
            });
            console.log('Folder created:', createRes.data);
            // Get folders
            const listRes = yield this.client.get(`/library/${this.config.libraryId}/folders`);
            console.log('Folders:', listRes.data);
            // Update folder
            const folderId = createRes.data.id;
            const updateRes = yield this.client.put(`/library/${this.config.libraryId}/folders/${folderId}`, { name: 'Updated Folder' });
            console.log('Folder updated:', updateRes.data);
            // Delete folder
            const deleteRes = yield this.client.delete(`/library/${this.config.libraryId}/folders/${folderId}`);
            console.log('Folder deleted:', deleteRes.data);
        });
    }
    testFileOperations() {
        return __awaiter(this, void 0, void 0, function* () {
            // Create file
            const createRes = yield this.client.post(`/library/${this.config.libraryId}/files`, {
                path: '/test/path',
                reference: 'test-reference'
            });
            console.log('File created:', createRes.data);
            // Get files
            const listRes = yield this.client.get(`/library/${this.config.libraryId}/files`);
            console.log('Files:', listRes.data);
            // Get single file
            const fileId = createRes.data.id;
            const getRes = yield this.client.get(`/library/${this.config.libraryId}/files/${fileId}`);
            console.log('File details:', getRes.data);
            // Update file
            const updateRes = yield this.client.put(`/library/${this.config.libraryId}/files/${fileId}`, { tags: ['test'] });
            console.log('File updated:', updateRes.data);
            // Delete file
            const deleteRes = yield this.client.delete(`/library/${this.config.libraryId}/files/${fileId}`);
            console.log('File deleted:', deleteRes.data);
        });
    }
    testTagOperations() {
        return __awaiter(this, void 0, void 0, function* () {
            // Create tag
            const createRes = yield this.client.post(`/library/${this.config.libraryId}/tags`, {
                name: 'Test Tag'
            });
            console.log('Tag created:', createRes.data);
            // Get tags
            const listRes = yield this.client.get(`/library/${this.config.libraryId}/tags`);
            console.log('Tags:', listRes.data);
            // Update tag
            const tagId = createRes.data.id;
            const updateRes = yield this.client.put(`/library/${this.config.libraryId}/tags/${tagId}`, { name: 'Updated Tag' });
            console.log('Tag updated:', updateRes.data);
            // Delete tag
            const deleteRes = yield this.client.delete(`/library/${this.config.libraryId}/tags/${tagId}`);
            console.log('Tag deleted:', deleteRes.data);
        });
    }
    runAllTests() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.connectLibrary();
                yield this.testFolderOperations();
                yield this.testFileOperations();
                yield this.testTagOperations();
                console.log('All tests completed successfully');
            }
            catch (error) {
                console.error('Test failed:', error);
                process.exit(1);
            }
        });
    }
}
exports.HttpLibraryTest = HttpLibraryTest;
// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new HttpLibraryTest();
    tester.runAllTests();
}
