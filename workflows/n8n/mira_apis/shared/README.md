# Mira API Nodes - Shared Components

This directory contains shared components and utilities for Mira API nodes to eliminate code duplication and improve maintainability.

## 📁 Structure

```
shared/
├── mira-common-properties.ts    # Common node properties and configurations
├── mira-auth-helper.ts          # Authentication and HTTP request helpers
└── mira-http-helper.ts          # Higher-level utilities for processing items
```

## 🔧 Components

### 1. `mira-common-properties.ts`

Contains reusable node property definitions and configurations:

- **`miraTokenProperties`**: Token source, server URL, and access token properties
- **`miraTokenCredentials`**: Common credentials configuration
- **`miraCommonNodeConfig`**: Base node configuration (icon, group, version, inputs, outputs)

### 2. `mira-auth-helper.ts`

Handles authentication and HTTP requests:

- **`getMiraAuthConfig()`**: Extracts authentication configuration from node parameters
- **`makeMiraRequest()`**: Makes authenticated HTTP requests to Mira API
- **`executeMiraOperation()`**: Wrapper with error handling for API operations

### 3. `mira-http-helper.ts`

High-level utilities for common patterns:

- **`processMiraItems()`**: Processes multiple input items with consistent error handling
- **`validateRequiredParameter()`**: Validates required parameters
- **`enhanceDeleteResponse()`**: Adds metadata to delete operation responses
- **`enhanceCreateResponse()`**: Adds metadata to create operation responses

## 🚀 Usage Examples

### Before Refactoring (Original Code)

```typescript
export class MiraAdminDelete implements INodeType {
    description: INodeTypeDescription = {
        // ... 100+ lines of repeated property definitions
        properties: [
            {
                displayName: 'Token Source',
                name: 'tokenSource',
                type: 'options',
                // ... repeated token properties
            },
            // ... more repeated properties
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const tokenSource = this.getNodeParameter('tokenSource', i) as string;
                const adminId = this.getNodeParameter('adminId', i) as string;
                let serverUrl: string;

                // ... 50+ lines of repeated authentication logic

                if (tokenSource === 'credentials') {
                    // ... credential-based request
                } else {
                    // ... token-based request
                }
                
                // ... repeated error handling
            } catch (error) {
                // ... repeated error handling
            }
        }

        return [returnData];
    }
}
```

### After Refactoring (Shared Components)

```typescript
import { miraTokenProperties, miraTokenCredentials, miraCommonNodeConfig } from '../../shared/mira-common-properties';
import { processMiraItems, validateRequiredParameter, enhanceDeleteResponse } from '../../shared/mira-http-helper';
import { MiraHttpOptions } from '../../shared/mira-auth-helper';

export class MiraAdminDelete implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Mira Admin Delete',
        name: 'miraAdminDelete',
        ...miraCommonNodeConfig,
        description: 'Delete administrator from Mira App Server (soft delete)',
        defaults: { name: 'Mira Admin Delete' },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: miraTokenCredentials,
        properties: [
            ...miraTokenProperties,
            {
                displayName: 'Admin ID',
                name: 'adminId',
                type: 'string',
                required: true,
                default: '',
                description: 'ID of the administrator to delete',
                placeholder: '{{ $json.id }}',
            },
            // ... only node-specific properties
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return await processMiraItems(
            this,
            async (itemIndex: number): Promise<MiraHttpOptions> => {
                const adminId = this.getNodeParameter('adminId', itemIndex) as string;
                validateRequiredParameter(this, 'Admin ID', adminId, itemIndex);

                return {
                    method: 'DELETE',
                    endpoint: `/api/admins/${adminId}`,
                };
            },
            (response: any, itemIndex: number) => {
                const adminId = this.getNodeParameter('adminId', itemIndex) as string;
                return enhanceDeleteResponse(response, adminId, 'admin_soft_delete');
            }
        );
    }
}
```

## 📊 Benefits

### Code Reduction
- **MiraAdminDelete**: 159 lines → ~50 lines (68% reduction)
- **MiraAdminCreate**: 190 lines → ~60 lines (68% reduction)
- **Properties**: 50+ lines → 3 lines (`...miraTokenProperties`)

### Consistency
- ✅ Identical authentication handling across all nodes
- ✅ Consistent error handling and error messages
- ✅ Standardized response formats
- ✅ Uniform parameter validation

### Maintainability
- 🔧 Single source of truth for authentication logic
- 🔧 Easy to update authentication patterns globally
- 🔧 Centralized error handling improvements
- 🔧 Type safety through shared interfaces

## 🛠️ Migration Guide

### Step 1: Update Imports
```typescript
import { miraTokenProperties, miraTokenCredentials, miraCommonNodeConfig } from '../../shared/mira-common-properties';
import { processMiraItems, validateRequiredParameter } from '../../shared/mira-http-helper';
import { MiraHttpOptions } from '../../shared/mira-auth-helper';
```

### Step 2: Simplify Node Description
```typescript
description: INodeTypeDescription = {
    displayName: 'Your Node Name',
    name: 'yourNodeName',
    ...miraCommonNodeConfig,
    description: 'Your node description',
    defaults: { name: 'Your Node Name' },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    credentials: miraTokenCredentials,
    properties: [
        ...miraTokenProperties,
        // ... only your node-specific properties
    ],
};
```

### Step 3: Simplify Execute Method
```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return await processMiraItems(
        this,
        async (itemIndex: number): Promise<MiraHttpOptions> => {
            // Get your node-specific parameters
            const param1 = this.getNodeParameter('param1', itemIndex) as string;
            const param2 = this.getNodeParameter('param2', itemIndex) as string;
            
            // Validate if needed
            validateRequiredParameter(this, 'Param1', param1, itemIndex);
            
            // Return HTTP options
            return {
                method: 'POST', // or GET, PUT, DELETE
                endpoint: '/api/your-endpoint',
                body: { param1, param2 }, // only for POST/PUT
            };
        },
        // Optional response enhancer
        (response: any, itemIndex: number) => {
            return enhanceCreateResponse(response, 'your_operation');
        }
    );
}
```

## 🎯 Supported HTTP Methods

All standard HTTP methods are supported:
- `GET` - For retrieving data
- `POST` - For creating resources
- `PUT` - For updating resources
- `DELETE` - For deleting resources
- `PATCH` - For partial updates

## 🔒 Authentication Patterns

### Credentials-based (Recommended)
- Uses `MiraApiCredential` stored in n8n credentials
- Automatically handles token refresh if supported
- More secure as tokens are not exposed in workflow

### Input-based
- Gets token from previous node output
- Useful when chaining with login operations
- Requires manual token management

## 📝 Notes

1. **Error Handling**: All shared components use consistent error handling patterns
2. **Type Safety**: TypeScript interfaces ensure proper usage
3. **Extensibility**: Easy to add new common patterns as they emerge
4. **Backward Compatibility**: Existing nodes continue to work unchanged

## 🤝 Contributing

When adding new common patterns:

1. Identify repeated code across 3+ nodes
2. Extract to appropriate shared module
3. Maintain backward compatibility
4. Update documentation and examples
5. Test with existing nodes
