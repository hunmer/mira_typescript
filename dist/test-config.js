"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
exports.defaultConfig = {
    baseURL: 'http://localhost:8081',
    libraryId: 'test-library',
    libraryConfig: {
        // Add your default library configuration here
        database: ':memory:',
        storagePath: './test-storage'
    }
};
