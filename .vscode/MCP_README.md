# Workspace MCP Configuration

这个工作区使用独立的 MCP (Model Context Protocol) 配置，与全局配置隔离。

## 配置文件

- **`.vscode/mcp.json`**: 工作区特定的 MCP 服务器配置
- **`.vscode/mcp-data/`**: MCP 服务的数据存储目录

## 配置说明

- **数据目录**: `D:\mira_typescript\.vscode\mcp-data`
- **Web 端口**: 3456 (避免与其他实例冲突)
- **模板语言**: 中文 (zh)
- **GUI**: 启用

## 与全局配置的区别

1. 使用工作区本地的数据目录，避免多个工作区之间的数据冲突
2. 使用独立的端口号，避免端口冲突
3. 配置存储在工作区内，便于版本控制和团队协作

## 重新加载配置

修改 MCP 配置后，需要重新加载 VS Code 窗口：
- `Ctrl+Shift+P` → `Developer: Reload Window`
