# n8n 节点开发指南

本指南基于 n8n 官方文档，总结了开发 n8n 社区节点的关键要点和最佳实践。

## 目录
- [项目结构](#项目结构)
- [节点类型](#节点类型)
- [开发环境设置](#开发环境设置)
- [节点文件结构](#节点文件结构)
- [package.json 配置](#packagejson-配置)
- [节点实现](#节点实现)
- [图标和元数据](#图标和元数据)
- [测试和调试](#测试和调试)
- [发布流程](#发布流程)
- [最佳实践](#最佳实践)

## 项目结构

### 标准文件结构
```
your-n8n-node/
├── nodes/
│   └── YourNodeName/
│       ├── YourNodeName.node.ts      # 节点实现
│       ├── YourNodeName.node.json    # 节点元数据
│       └── icon.svg                  # 节点图标
├── credentials/                      # 认证文件（可选）
│   └── YourCredentials.credentials.ts
├── dist/                            # 构建输出
├── package.json
├── tsconfig.json
└── README.md
```

### 关键要求
- 节点类名和文件名必须匹配
- 文件命名使用 PascalCase
- 节点名称使用 camelCase
- 必须有对应的 `.node.json` 元数据文件

## 节点类型

### 1. 普通节点 (Regular Nodes)
- 处理数据和执行操作
- 有输入和输出
- 实现 `INodeType` 接口

### 2. 触发器节点 (Trigger Nodes)
- 启动工作流
- 监听事件或定时执行
- 实现 `INodeType` 接口，但使用 `trigger()` 方法

### 3. 子节点 (Sub-nodes)
- LangChain 等复杂节点的组件
- 专门用于特定框架

## 开发环境设置

### 前置条件
```bash
# Node.js 版本要求
node >= 18.17.0

# 必需的依赖
npm install n8n-workflow n8n-core --save-peer
```

### 项目初始化
```bash
# 使用官方模板（推荐）
git clone https://github.com/n8n-io/n8n-nodes-starter.git
cd n8n-nodes-starter
npm install
```

## 节点文件结构

### 基本节点结构
```typescript
import {
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  IExecuteFunctions,
} from 'n8n-workflow';

export class YourNodeName implements INodeType {
  description: INodeTypeDescription = {
    displayName: '节点显示名称',
    name: 'yourNodeName',
    icon: 'file:icon.svg',
    group: ['transform'], // 或 ['trigger']
    version: 1,
    description: '节点描述',
    defaults: {
      name: '默认节点名称',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      // 节点参数配置
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // 节点执行逻辑
  }
}
```

### 触发器节点结构
```typescript
import {
  INodeType,
  INodeTypeDescription,
  ITriggerFunctions,
  ITriggerResponse,
} from 'n8n-workflow';

export class YourTriggerNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: '触发器节点名称',
    name: 'yourTriggerNode',
    icon: 'file:icon.svg',
    group: ['trigger'],
    version: 1,
    description: '触发器描述',
    defaults: {
      name: '默认触发器名称',
    },
    inputs: [],
    outputs: ['main'],
    properties: [
      // 触发器参数配置
    ],
  };

  async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
    // 触发器逻辑
    return {
      closeFunction: async () => {
        // 清理逻辑
      },
    };
  }
}
```

## package.json 配置

### 必需字段
```json
{
  "name": "n8n-nodes-your-package-name",
  "version": "1.0.0",
  "description": "节点包描述",
  "keywords": [
    "n8n-community-node-package",  // 必需关键字
    "n8n"
  ],
  "license": "MIT",
  "homepage": "https://github.com/your-username/your-repo",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-username/your-repo.git"
  },
  "main": "index.js",
  "files": [
    "dist"
  ],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/YourCredentials.credentials.js"
    ],
    "nodes": [
      "dist/nodes/YourNodeName/YourNodeName.node.js"
    ]
  },
  "peerDependencies": {
    "n8n-workflow": "^1.82.0"
  }
}
```

### 构建脚本
```json
{
  "scripts": {
    "build": "tsc && npm run copy-assets",
    "copy-assets": "copyfiles -u 1 nodes/**/*.{json,svg} dist/",
    "dev": "tsc -w",
    "prepack": "npm run build"
  }
}
```

## 节点实现

### 参数配置
```typescript
properties: [
  {
    displayName: '参数显示名称',
    name: 'parameterName',
    type: 'string', // string, number, boolean, options, collection
    default: '',
    description: '参数描述',
    required: true,
  },
  {
    displayName: '选项参数',
    name: 'optionParameter',
    type: 'options',
    options: [
      { name: '选项1', value: 'option1' },
      { name: '选项2', value: 'option2' },
    ],
    default: 'option1',
  },
  {
    displayName: '高级选项',
    name: 'advancedOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    options: [
      // 子选项
    ],
  }
]
```

### 错误处理
```typescript
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

// API 错误
throw new NodeApiError(this.getNode(), response);

// 操作错误
throw new NodeOperationError(this.getNode(), 'Error message');
```

### HTTP 请求
```typescript
const response = await this.helpers.request({
  method: 'GET',
  url: 'https://api.example.com/data',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  json: true,
});
```

## 图标和元数据

### 图标要求
- 格式：SVG（推荐）或 PNG
- 尺寸：60x60px（PNG）
- 比例：正方形或接近正方形
- 引用：`icon: 'file:icon.svg'`

### 元数据文件 (.node.json)
```json
{
  "node": "n8n-nodes-your-package.yourNodeName",
  "nodeVersion": "1.0",
  "codexVersion": "1.0",
  "categories": [
    "Communication",
    "Utility"
  ],
  "resources": {
    "credentialDocumentation": [
      {
        "url": "https://docs.example.com/credentials"
      }
    ],
    "primaryDocumentation": [
      {
        "url": "https://docs.example.com"
      }
    ]
  }
}
```

## 测试和调试

### 本地测试
```bash
# 构建节点
npm run build

# 链接到本地 n8n
npm link

# 在 n8n 自定义目录中安装
cd ~/.n8n/custom
npm link your-package-name

# 启动 n8n
n8n start
```

### 调试选项
- 使用 `console.log()` 进行基本调试
- 在节点中添加调试参数
- 使用 VS Code 调试器

### Linting
```bash
# 使用官方 linter
npx n8n-node-linter

# 自动修复
npx n8n-node-linter --fix
```

## 发布流程

### 验证检查清单
- [ ] 节点功能正常
- [ ] 错误处理完善
- [ ] 文档完整
- [ ] 图标符合要求
- [ ] package.json 配置正确
- [ ] 通过 linter 检查

### 发布步骤
```bash
# 构建项目
npm run build

# 版本更新
npm version patch

# 发布到 npm
npm publish

# 推送到 Git
git push --follow-tags
```

### 社区节点提交
1. 在 [n8n 社区节点仓库](https://github.com/n8n-io/n8n-nodes-registry) 提交 PR
2. 填写节点信息表单
3. 等待审核和合并

## 最佳实践

### 代码质量
- 使用 TypeScript 严格模式
- 遵循 n8n 命名约定
- 实现适当的错误处理
- 添加详细的参数描述

### 用户体验
- 提供清晰的节点描述
- 使用直观的参数名称
- 添加有用的默认值
- 实现参数验证

### 性能考虑
- 避免阻塞操作
- 合理使用缓存
- 处理大数据集时考虑分页
- 实现适当的超时机制

### 安全性
- 验证用户输入
- 安全处理敏感数据
- 使用 HTTPS 进行 API 调用
- 不在日志中记录敏感信息

### 文档
- 编写清晰的 README
- 提供使用示例
- 说明依赖要求
- 包含故障排除信息

## 常见问题

### 文件路径问题
- 确保使用正确的相对路径
- 图标文件必须在节点目录中
- 构建后检查 dist 目录结构

### 节点不显示
- 检查 package.json 中的 n8n 配置
- 确认节点文件路径正确
- 验证节点名称和类名匹配

### 认证问题
- 实现适当的认证接口
- 测试认证流程
- 处理认证失败情况

## 资源链接

- [n8n 官方文档](https://docs.n8n.io/integrations/creating-nodes/)
- [节点开发模板](https://github.com/n8n-io/n8n-nodes-starter)
- [社区节点注册表](https://github.com/n8n-io/n8n-nodes-registry)
- [API 参考](https://docs.n8n.io/api/)
- [示例节点](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes)

---

**注意**: 本指南基于 n8n v1.x 版本，具体实现可能因版本而异。请参考最新的官方文档获取最新信息。
