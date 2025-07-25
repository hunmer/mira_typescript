/**
 * 获取目录下的librarys.json文件内容
 * @param dirPath 目录路径
 * @returns 返回解析后的JSON对象
 * @throws 当文件不存在或JSON解析失败时抛出错误
 */
async function getLibrarysJson(dirPath: string = './'): Promise<any> {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
        const filePath = path.join(dirPath, 'librarys.json');
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(err);
        throw new Error(`Failed to read or parse librarys.json `);
    }
}


export {getLibrarysJson}