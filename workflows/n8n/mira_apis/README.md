# Mira APIs - n8n Community Nodes

🎉 **项目完成** - 100% API 覆盖率，已通过完整测试验证

This package provides n8n nodes for integrating with Mira App Server APIs.

## 📊 完成状态

### ✅ 已实现的节点 (9/9)
- **MiraAuth**: 认证管理 (4 个功能)
- **MiraUser**: 用户管理 (2 个功能)  
- **MiraAdmin**: 管理员管理 (2 个功能)
- **MiraLibrary**: 素材库管理 (6 个功能)
- **MiraPlugin**: 插件管理 (6 个功能)
- **MiraFile**: 文件管理 (3 个功能)
- **MiraDatabase**: 数据库管理 (3 个功能)
- **MiraDevice**: 设备管理 (5 个功能)
- **MiraSystem**: 系统状态 (2 个功能)

**总计**: 33 个 API 功能，100% 覆盖 Mira App Server APIs

## Installation

```bash
npm install n8n-nodes-mira-apis
```

## Included Nodes

### 1. Mira Auth
Handles authentication operations:
- Login
- Logout  
- Verify Token
- Get Permission Codes

### 2. Mira User
Manages user operations:
- Get User Info
- Update User Info

### 3. Mira Admin  
Manages administrator operations:
- List Administrators
- Create Administrator

### 4. Mira Library
Manages library operations:
- List Libraries
- Create Library
- Update Library
- Delete Library
- Start Library Service
- Stop Library Service

### 5. Mira Plugin
Manages plugin operations:
- List Plugins
- Get Plugin Info
- Start Plugin
- Stop Plugin
- Install Plugin
- Uninstall Plugin

### 6. Mira File
Manages file operations:
- Upload Files
- Download Files  
- Delete Files

### 7. Mira Database
Manages database operations:
- List Tables
- Get Table Data
- Get Table Schema

### 8. Mira Device
Manages device operations:
- List All Devices
- Get Devices by Library
- Disconnect Device
- Send Message to Device
- Get Device Statistics

### 9. Mira System
Gets system status:
- Health Check (Detailed)
- Simple Health Check

## Credentials

The nodes use the "Mira API" credential type which requires:
- Server URL (default: http://localhost:8081)
- Username
- Password

## Usage

1. Configure your Mira API credentials
2. Add the desired Mira node to your workflow
3. Select the operation you want to perform
4. Configure the required parameters
5. Execute the workflow

## API Reference

For detailed API documentation, see the [Mira App Server API Reference](../../packages/mira-app-server/API_REFERENCE.md).

## Development

See the [N8N Node Development Guide](../N8N_NODE_DEVELOPMENT_GUIDE.md) for development instructions.

## License

MIT
