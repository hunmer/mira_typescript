const fs = require('fs');
const path = require('path');

// 替换映射表
const replacements = [
    // Import 替换
    {
        from: /import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'/g,
        to: "import { message, Modal, type FormInstance } from 'ant-design-vue'\nimport type { Rule } from 'ant-design-vue/es/form'"
    },
    {
        from: /import { ElMessage, ElMessageBox } from 'element-plus'/g,
        to: "import { message, Modal } from 'ant-design-vue'"
    },
    {
        from: /import { ElMessage } from 'element-plus'/g,
        to: "import { message } from 'ant-design-vue'"
    },

    // Element Plus 组件替换
    { from: /ElMessage\.success/g, to: 'message.success' },
    { from: /ElMessage\.error/g, to: 'message.error' },
    { from: /ElMessage\.warning/g, to: 'message.warning' },
    { from: /ElMessage\.info/g, to: 'message.info' },

    // MessageBox 替换
    { from: /ElMessageBox\.confirm/g, to: 'Modal.confirm' },

    // 类型替换
    { from: /type FormRules/g, to: 'Record<string, Rule[]>' },
    { from: /FormRules/g, to: 'Record<string, Rule[]>' },

    // 模板组件替换
    { from: /<el-button/g, to: '<a-button' },
    { from: /<\/el-button>/g, to: '</a-button>' },
    { from: /<el-input/g, to: '<a-input' },
    { from: /<\/el-input>/g, to: '</a-input>' },
    { from: /<el-table/g, to: '<a-table' },
    { from: /<\/el-table>/g, to: '</a-table>' },
    { from: /<el-table-column/g, to: '<a-table-column' },
    { from: /<\/el-table-column>/g, to: '</a-table-column>' },
    { from: /<el-form/g, to: '<a-form' },
    { from: /<\/el-form>/g, to: '</a-form>' },
    { from: /<el-form-item/g, to: '<a-form-item' },
    { from: /<\/el-form-item>/g, to: '</a-form-item>' },
    { from: /<el-dialog/g, to: '<a-modal' },
    { from: /<\/el-dialog>/g, to: '</a-modal>' },
    { from: /<el-select/g, to: '<a-select' },
    { from: /<\/el-select>/g, to: '</a-select>' },
    { from: /<el-option/g, to: '<a-option' },
    { from: /<\/el-option>/g, to: '</a-option>' },
    { from: /<el-card/g, to: '<a-card' },
    { from: /<\/el-card>/g, to: '</a-card>' },
    { from: /<el-tag/g, to: '<a-tag' },
    { from: /<\/el-tag>/g, to: '</a-tag>' },
    { from: /<el-switch/g, to: '<a-switch' },
    { from: /<\/el-switch>/g, to: '</a-switch>' },
    { from: /<el-tooltip/g, to: '<a-tooltip' },
    { from: /<\/el-tooltip>/g, to: '</a-tooltip>' },
    { from: /<el-icon/g, to: '<component :is="iconComponent"' },
    { from: /<\/el-icon>/g, to: '</component>' },

    // 属性替换
    { from: /v-model="/g, to: 'v-model:value="' },
    { from: /:model="/g, to: ':model="' },
    { from: /prop="/g, to: 'name="' },
    { from: /type="primary"/g, to: 'type="primary"' },
    { from: /type="success"/g, to: 'type="primary"' },
    { from: /type="warning"/g, to: 'type="primary"' },
    { from: /type="danger"/g, to: 'danger' },
    { from: /v-loading="/g, to: ':loading="' },
    { from: /#header/g, to: '#title' },
    { from: /#dropdown/g, to: '#overlay' },
];

// 递归遍历目录
function processDirectory(dir) {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.includes('node_modules')) {
            processDirectory(fullPath);
        } else if (item.endsWith('.vue') || item.endsWith('.ts')) {
            processFile(fullPath);
        }
    });
}

// 处理单个文件
function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;

        replacements.forEach(({ from, to }) => {
            if (content.match(from)) {
                content = content.replace(from, to);
                hasChanges = true;
            }
        });

        if (hasChanges) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ Updated: ${filePath}`);
        }
    } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error.message);
    }
}

// 开始处理
console.log('🚀 Starting Element Plus to Ant Design Vue migration...');
processDirectory('./src');
console.log('✅ Migration completed!');
