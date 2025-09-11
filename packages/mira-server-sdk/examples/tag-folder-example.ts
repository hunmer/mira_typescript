/**
 * 标签和文件夹管理示例
 * 展示如何使用 TagModule, FolderModule 和 FileModule 的新功能
 */

import { MiraClient } from '../index';

async function tagAndFolderExample() {
    // 初始化客户端
    const client = new MiraClient('http://localhost:8081');
    
    try {
        // 登录（假设已有账户）
        await client.auth().login('admin', 'admin123');
        console.log('✅ 登录成功');

        const libraryId = '1755239013113';

        // ===== 标签管理示例 =====
        console.log('\n🏷️  标签管理示例');
        
        // 1. 获取所有标签
        const allTags = await client.tags().getAll(libraryId);
        console.log('所有标签:', allTags);

        // 2. 创建新标签
        const newTag = await client.tags().createTag(libraryId, '重要文档', 0xff0000, '重要的文档标签');
        console.log('创建的标签:', newTag);

        // 3. 按标题查询标签
        const foundTags = await client.tags().findByTitle(libraryId, '重要');
        console.log('查询到的标签:', foundTags);

        // 4. 更新标签
        if (newTag?.id) {
            const updatedTag = await client.tags().updateTag(libraryId, newTag.id, {
                title: '非常重要的文档',
                color: 0xff6600
            });
            console.log('更新后的标签:', updatedTag);
        }

        // ===== 文件夹管理示例 =====
        console.log('\n📁 文件夹管理示例');

        // 1. 获取所有文件夹
        const allFolders = await client.folders().getAll(libraryId);
        console.log('所有文件夹:', allFolders);

        // 2. 创建根文件夹
        const rootFolder = await client.folders().createFolder(libraryId, '项目文档');
        console.log('创建的根文件夹:', rootFolder);

        // 3. 创建子文件夹
        if (rootFolder?.id) {
            const subFolder = await client.folders().createFolder(
                libraryId, 
                '设计文档', 
                rootFolder.id,
                0x00ff00, // 绿色
                '项目设计相关文档'
            );
            console.log('创建的子文件夹:', subFolder);
        }

        // 4. 获取根文件夹列表
        const rootFolders = await client.folders().getRootFolders(libraryId);
        console.log('根文件夹列表:', rootFolders);

        // ===== 文件管理示例 =====
        console.log('\n📄 文件管理示例');

        // 1. 获取所有文件
        const allFiles = await client.files().getAllFiles(libraryId);
        console.log('所有文件数量:', allFiles?.length);

        // 2. 按标签筛选文件
        const taggedFiles = await client.files().getFilesByTags(libraryId, ['重要文档']);
        console.log('带标签的文件:', taggedFiles);

        // 3. 按文件夹筛选文件
        if (rootFolder?.id) {
            const folderFiles = await client.files().getFilesByFolder(libraryId, rootFolder.id);
            console.log('文件夹中的文件:', folderFiles);
        }

        // 4. 按文件标题搜索
        const searchResults = await client.files().searchFilesByTitle(libraryId, 'document');
        console.log('搜索结果:', searchResults);

        // 5. 按扩展名筛选
        const pdfFiles = await client.files().getFilesByExtension(libraryId, '.pdf');
        console.log('PDF文件:', pdfFiles);

        // 6. 按大小筛选（1MB到10MB之间的文件）
        const mediumFiles = await client.files().getFilesBySize(libraryId, 1024 * 1024, 10 * 1024 * 1024);
        console.log('中等大小文件:', mediumFiles);

        // 7. 分页获取文件
        const paginatedFiles = await client.files().getFilesPaginated(libraryId, 1, 10);
        console.log('分页文件结果:', paginatedFiles);

        // ===== 文件标签和文件夹关联示例 =====
        console.log('\n🔗 文件关联示例');

        // 假设有一个文件ID
        const fileId = 1; // 替换为实际的文件ID

        // 1. 为文件设置标签
        if (newTag?.title) {
            const setTagResult = await client.tags().addTagsToFile(libraryId, fileId, [newTag.title]);
            console.log('设置标签结果:', setTagResult);
        }

        // 2. 获取文件的标签
        const fileTags = await client.tags().getFileTagList(libraryId, fileId);
        console.log('文件标签:', fileTags);

        // 3. 将文件移动到文件夹
        if (rootFolder?.id) {
            const moveResult = await client.folders().moveFileToFolder(libraryId, fileId, rootFolder.id);
            console.log('移动文件结果:', moveResult);
        }

        // 4. 获取文件所在文件夹
        const fileFolder = await client.folders().getFileFolderInfo(libraryId, fileId);
        console.log('文件所在文件夹:', fileFolder);

        // ===== 高级查询示例 =====
        console.log('\n🔍 高级查询示例');

        // 1. 复合条件查询
        const complexQuery = await client.files().getFiles({
            libraryId,
            filters: {
                extension: '.jpg',
                size_min: 100 * 1024, // 最小100KB
                folder_id: rootFolder?.id,
                tags: ['重要文档'],
                limit: 5
            }
        });
        console.log('复合查询结果:', complexQuery);

        // 2. 按时间范围查询
        const recentFiles = await client.files().getFilesByDateRange(
            libraryId,
            '2024-01-01T00:00:00Z',
            '2024-12-31T23:59:59Z'
        );
        console.log('2024年的文件:', recentFiles);

        console.log('\n✅ 所有示例执行完成');

    } catch (error) {
        console.error('❌ 示例执行失败:', error);
    }
}

// 如果作为主模块运行，则执行示例
if (require.main === module) {
    tagAndFolderExample();
}

export { tagAndFolderExample };
