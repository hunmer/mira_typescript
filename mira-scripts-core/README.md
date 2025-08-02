# Mira Tools - 图书馆数据处理工具集

这是一个用于处理Mira图书馆系统数据的工具集，包含数据转换和文件导入功能。

## 🚀 快速开始

### 安装依赖

在`tools`目录中安装所需的依赖包：

```bash
cd tools
npm install
```

### 使用方法

有三种方式运行工具：

#### 方式一：使用npm脚本（推荐）
```bash
npm run script <command> [options]
```

#### 方式二：直接使用ts-node
```bash
ts-node index.ts <command> [options]
```

#### 方式三：直接运行特定脚本
```bash
ts-node scripts/<script-name>.ts [options]
```

## 📋 可用命令

### 查看帮助
```bash
npm run script --help
```

### 1. 数据库转换工具 (`convert`)

将源SQLite数据库的数据转换并导入到新的目标目录中。

#### 基本用法
```bash
npm run script convert -- --sourceDbPath=source.db --targetDir=./target
```

#### 高级用法
```bash
# 仅转换特定文件夹
npm run script convert -- --sourceDbPath=source.db --targetDir=./target --targetFolders=1,2,3

# 仅转换带有特定标签的文件
npm run script convert -- --sourceDbPath=source.db --targetDir=./target --targetTags=5,6

# 移动文件而不是复制
npm run script convert -- --sourceDbPath=source.db --targetDir=./target --importType=move

# 仅创建链接（不复制文件）
npm run script convert -- --sourceDbPath=source.db --targetDir=./target --importType=link
```

#### 参数说明
- `--sourceDbPath`: 源SQLite数据库文件路径（必需）
- `--targetDir`: 目标目录路径（必需）
- `--targetFolders`: 仅导入指定文件夹ID，用逗号分隔（可选）
- `--targetTags`: 仅导入带有指定标签ID的文件，用逗号分隔（可选，与targetFolders互斥）
- `--importType`: 导入类型 - `copy`(复制), `move`(移动), `link`(仅链接) （可选，默认：copy）

### 2. 文件导入工具 (`import`)

将指定路径的文件导入到图书馆数据库中。

#### 基本用法
```bash
npm run script import -- --source=./files --target=library.db
```

#### 高级用法
```bash
# 移动文件而不是复制
npm run script import -- --source=/path/to/files --target=library.db --importType=move

# 限制文件夹深度
npm run script import -- --source=./documents --target=library.db --maxFolderDepth=3
```

#### 参数说明
- `--source`: 源文件或目录路径（必需）
- `--target`: 目标数据库路径（可选）
- `--importType`: 导入类型 - `copy`(复制) 或 `move`(移动) （可选，默认：copy）
- `--maxFolderDepth`: 保留的最大文件夹深度（可选）

## 🛠️ 开发环境要求

- Node.js 14.0+
- TypeScript 4.0+
- npm 或 yarn

## 📦 依赖包

本工具集依赖以下包：
- `mira-storage-sqlite`: SQLite存储后端
- `mira-app-core`: Mira核心功能
- `sqlite3`: SQLite数据库接口
- `typescript`: TypeScript编译器
- `ts-node`: TypeScript直接执行器

## 🔧 配置

工具使用以下TypeScript配置（`tsconfig.json`）：
- 目标：ES2020
- 模块：CommonJS
- 严格模式：启用
- 输出目录：`./dist`

## 🚨 注意事项

1. **数据安全**：在使用`move`模式前，请确保已备份源数据
2. **路径格式**：在Windows系统中，路径可以使用正斜杠或反斜杠
3. **权限**：确保工具对源和目标路径具有适当的读写权限
4. **空间**：确保目标磁盘有足够的空间存储导入的文件

## 🐛 故障排除

### 常见问题

1. **"模块未找到"错误**
   ```bash
   cd tools
   npm install
   ```

2. **权限错误**
   - 检查文件/目录权限
   - 在Windows上可能需要以管理员身份运行

3. **路径不存在**
   - 确认源路径存在且可访问
   - 使用绝对路径避免相对路径问题

4. **SQLite数据库错误**
   - 确认数据库文件完整且可读
   - 检查数据库格式是否兼容

### 获取详细帮助

查看特定命令的详细帮助：
```bash
npm run script <command> --help
```

或直接运行脚本获取帮助：
```bash
ts-node scripts/convertLibraryData.ts --help
ts-node scripts/pathFilesToLibrary.ts --help
```

## 📝 示例工作流

### 场景1：迁移现有图书馆数据
```bash
# 1. 安装依赖
npm install

# 2. 转换数据库到新目录
npm run script convert -- --sourceDbPath=old_library.db --targetDir=./new_library

# 3. 验证转换结果
ls -la ./new_library
```

### 场景2：导入新文件到图书馆
```bash
# 1. 导入文档文件夹
npm run script import -- --source=./documents --target=library.db

# 2. 导入特定文件（移动模式）
npm run script import -- --source=/path/to/important/file.pdf --target=library.db --importType=move
```

### 场景3：部分数据迁移
```bash
# 只迁移特定文件夹的数据
npm run script convert -- --sourceDbPath=source.db --targetDir=./target --targetFolders=1,5,10

# 只迁移带有特定标签的文件
npm run script convert -- --sourceDbPath=source.db --targetDir=./target --targetTags=3,7
```
