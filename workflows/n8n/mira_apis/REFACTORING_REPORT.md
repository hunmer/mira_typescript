
## 🔧 使用的共享组件

### `shared/mira-common-properties.ts`
- `miraTokenProperties`: Token 认证相关属性
- `miraTokenCredentials`: 凭据配置
- `miraCommonNodeConfig`: 基础节点配置

### `shared/mira-auth-helper.ts`
- `getMiraAuthConfig()`: 认证配置提取
- `makeMiraRequest()`: 认证 HTTP 请求
- `executeMiraOperation()`: 操作包装器

### `shared/mira-http-helper.ts`
- `processMiraItems()`: 批量处理
- `validateRequiredParameter()`: 参数验证
- `enhanceDeleteResponse()`: 删除响应增强

