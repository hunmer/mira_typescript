import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import * as path from 'path';

// Helper function to format file size
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to detect MIME type
export function detectMimeType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.zip': 'application/zip',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return mimeTypes[extension] || 'application/octet-stream';
}

// Helper function to check if content is binary
export function isBinaryContent(buffer: Buffer): boolean {
    for (let i = 0; i < Math.min(buffer.length, 512); i++) {
        const byte = buffer[i];
        if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
            return true;
        }
    }
    return false;
}

// Helper function to calculate MD5 checksum
export async function calculateMd5Checksum(filePath: string): Promise<string> {
    const hash = createHash('md5');
    const stream = await fs.readFile(filePath);
    hash.update(stream);
    return hash.digest('hex');
}

// Helper function to get files recursively
export async function getFilesRecursively(
    dirPath: string,
    maxDepth: number = 10,
    currentDepth: number = 0,
    patterns: string[] = [],
    excludePatterns: string[] = []
): Promise<Array<{ path: string; name: string; isDirectory: boolean; stats: any }>> {
    const results: Array<{ path: string; name: string; isDirectory: boolean; stats: any }> = [];

    if (currentDepth >= maxDepth) {
        return results;
    }

    try {
        const items = await fs.readdir(dirPath);

        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stats = await fs.stat(fullPath);

            const fileInfo = {
                path: fullPath,
                name: item,
                isDirectory: stats.isDirectory(),
                stats
            };

            // Apply exclude patterns
            const shouldExclude = excludePatterns.some(pattern => {
                const regex = new RegExp(pattern);
                return regex.test(item) || regex.test(fullPath);
            });

            if (shouldExclude) {
                continue;
            }

            // Apply include patterns (if any)
            if (patterns.length > 0) {
                const shouldInclude = patterns.some(pattern => {
                    const regex = new RegExp(pattern);
                    return regex.test(item) || regex.test(fullPath);
                });

                if (!shouldInclude && !stats.isDirectory()) {
                    continue;
                }
            }

            results.push(fileInfo);

            // Recurse into directories
            if (stats.isDirectory()) {
                const subResults = await getFilesRecursively(
                    fullPath,
                    maxDepth,
                    currentDepth + 1,
                    patterns,
                    excludePatterns
                );
                results.push(...subResults);
            }
        }
    } catch (error) {
        // Skip directories we can't read
    }

    return results;
}

// Helper function to sort files
export function sortFiles(
    files: Array<{ path: string; name: string; isDirectory: boolean; stats: any }>,
    sortBy: string,
    sortOrder: string
): Array<{ path: string; name: string; isDirectory: boolean; stats: any }> {
    return files.sort((a, b) => {
        let compareValue = 0;

        switch (sortBy) {
            case 'name':
                compareValue = a.name.localeCompare(b.name);
                break;
            case 'size':
                compareValue = a.stats.size - b.stats.size;
                break;
            case 'modified':
                compareValue = new Date(a.stats.mtime).getTime() - new Date(b.stats.mtime).getTime();
                break;
            case 'created':
                compareValue = new Date(a.stats.ctime).getTime() - new Date(b.stats.ctime).getTime();
                break;
            case 'type':
                // Directories first, then by extension
                if (a.isDirectory && !b.isDirectory) {
                    compareValue = -1;
                } else if (!a.isDirectory && b.isDirectory) {
                    compareValue = 1;
                } else {
                    const aExt = path.extname(a.name);
                    const bExt = path.extname(b.name);
                    compareValue = aExt.localeCompare(bExt);
                }
                break;
            default:
                compareValue = a.name.localeCompare(b.name);
        }

        return sortOrder === 'desc' ? -compareValue : compareValue;
    });
}

// Helper function to copy directory recursively
export async function copyDirectoryRecursive(source: string, destination: string, preserveTimestamps: boolean = false): Promise<number> {
    let totalBytes = 0;

    // Create destination directory
    await fs.mkdir(destination, { recursive: true });

    const items = await fs.readdir(source);

    for (const item of items) {
        const sourcePath = path.join(source, item);
        const destPath = path.join(destination, item);
        const stats = await fs.stat(sourcePath);

        if (stats.isDirectory()) {
            totalBytes += await copyDirectoryRecursive(sourcePath, destPath, preserveTimestamps);
        } else {
            await fs.copyFile(sourcePath, destPath);
            totalBytes += stats.size;

            // Preserve timestamps if requested
            if (preserveTimestamps) {
                await fs.utimes(destPath, stats.atime, stats.mtime);
            }
        }
    }

    return totalBytes;
}

// Helper function to check if filters pass
export function passesFileFilters(
    filePath: string,
    fileName: string,
    stats: any,
    filters: any
): boolean {
    // Name pattern filter
    if (filters.namePattern) {
        const regex = new RegExp(filters.namePattern, 'i');
        if (!regex.test(fileName)) {
            return false;
        }
    }

    // Extension filter
    if (filters.extensions && filters.extensions.length > 0) {
        const ext = path.extname(fileName).toLowerCase().substring(1);
        if (!filters.extensions.includes(ext)) {
            return false;
        }
    }

    // Size filters
    if (filters.minSize !== undefined && stats.size < filters.minSize) {
        return false;
    }
    if (filters.maxSize !== undefined && stats.size > filters.maxSize) {
        return false;
    }

    // Date filters
    const fileDate = new Date(stats.mtime);
    if (filters.modifiedAfter) {
        const afterDate = new Date(filters.modifiedAfter);
        if (fileDate <= afterDate) {
            return false;
        }
    }
    if (filters.modifiedBefore) {
        const beforeDate = new Date(filters.modifiedBefore);
        if (fileDate >= beforeDate) {
            return false;
        }
    }

    // Type filter
    if (filters.fileType) {
        if (filters.fileType === 'file' && stats.isDirectory()) {
            return false;
        }
        if (filters.fileType === 'directory' && !stats.isDirectory()) {
            return false;
        }
    }

    return true;
}
