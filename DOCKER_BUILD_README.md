# Docker Build GitHub Actions

本项目包含多个GitHub Actions工作流来自动构建和推送Docker镜像：

## 工作流文件

### 1. `docker-build.yml` - 主构建工作流
这个工作流会将Docker镜像推送到GitHub Container Registry (ghcr.io)。

**触发条件：**
- 推送到 `main` 分支
- 创建以 `v` 开头的标签（如 `v1.0.0`）
- 向 `main` 分支提交PR

### 2. `docker-test.yml` - 测试构建工作流
这个工作流只测试Docker构建，不推送镜像。

**触发条件：**
- 向 `main` 分支提交PR
- 修改相关文件时（Dockerfile、源代码等）

### 3. `docker-release.yml` - 发版工作流
当创建GitHub Release时自动构建和发布Docker镜像。

**触发条件：**
- 发布GitHub Release

### 4. `docker-hub-build.yml` - Docker Hub工作流（可选）
推送到Docker Hub的备选工作流。

## 文件结构

```
.github/workflows/
├── docker-build.yml      # 主构建和推送工作流
├── docker-test.yml       # PR测试构建工作流  
├── docker-release.yml    # Release发版工作流
└── docker-hub-build.yml  # Docker Hub工作流（可选）

packages/mira-app-server/
├── Dockerfile           # 原始Dockerfile
├── Dockerfile.optimized # 优化的多阶段构建Dockerfile
└── ...

.dockerignore            # Docker构建忽略文件
```

## Docker文件说明

### Dockerfile vs Dockerfile.optimized

- **Dockerfile**: 原始版本，适合开发环境
- **Dockerfile.optimized**: 多阶段构建版本，镜像更小，更安全
  - 使用非root用户运行
  - 包含健康检查
  - 更小的最终镜像大小

## 工作流特性

**所有工作流共同特性：**
- 支持多架构构建 (linux/amd64, linux/arm64)
- 使用GitHub Actions缓存加速构建
- 自动生成构建证明（artifact attestation）
- 智能标签生成

## 设置说明

### 使用GitHub Container Registry（推荐）
1. 确保你的仓库有正确的权限设置
2. 工作流会自动使用 `GITHUB_TOKEN` 进行认证
3. 镜像将发布到 `ghcr.io/你的用户名/mira_typescript/mira-app-server`

### 使用Docker Hub（可选）
1. 在Docker Hub创建访问令牌：
   - 登录Docker Hub
   - 进入 Account Settings > Security
   - 创建新的访问令牌
2. 在GitHub仓库中设置Secrets：
   - 进入仓库的 Settings > Secrets and variables > Actions
   - 添加以下secrets：
     - `DOCKERHUB_USERNAME`: 你的Docker Hub用户名
     - `DOCKERHUB_TOKEN`: 你刚创建的访问令牌

## 使用方式

### 自动构建触发

1. **开发版本**: 推送到 `main` 分支会自动构建并推送 `main` 标签镜像
2. **测试构建**: 提交PR时会测试构建但不推送镜像
3. **正式发版**: 创建GitHub Release会构建并推送 `latest` 和版本号标签的镜像

### 手动触发

你也可以在GitHub Actions页面手动触发工作流运行。

## 镜像标签规则

工作流会根据以下规则自动生成镜像标签：

- **分支推送**: `main` -> `main` 标签
- **PR**: `pr-123` 标签格式
- **版本标签**: `v1.2.3` -> `1.2.3`, `1.2`, `1` 标签
- **提交SHA**: `main-abc1234` 格式

## 使用构建的镜像

### 从GitHub Container Registry拉取：
```bash
docker pull ghcr.io/你的用户名/mira_typescript/mira-app-server:main
```

### 从Docker Hub拉取：
```bash
docker pull 你的用户名/mira-app-server:main
```

## 本地测试

在提交之前，你可以本地测试Docker构建：

```bash
# 测试原始Dockerfile
cd packages/mira-app-server
docker build -t mira-app-server:test .

# 测试优化版Dockerfile
docker build -f Dockerfile.optimized -t mira-app-server:optimized .

# 运行容器测试
docker run -p 3000:3000 -p 8081:8081 mira-app-server:test
```

## 发版流程建议

1. **开发阶段**: 在功能分支开发，PR会触发测试构建
2. **合并到main**: 自动构建并推送开发版镜像
3. **创建Release**: 
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   然后在GitHub创建Release，会自动构建正式版镜像

## 故障排除

1. **构建失败**: 检查Dockerfile是否有语法错误
2. **推送失败**: 确保已正确设置secrets和权限
3. **多架构构建问题**: 可以在workflow中移除 `platforms` 行只构建当前架构

## 注意事项

- GitHub Container Registry是免费的，但有使用限制
- Docker Hub免费账户有拉取限制
- 建议使用GitHub Container Registry除非你特别需要Docker Hub
