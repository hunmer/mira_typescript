<template>
  <div class="library-manager">
    <div class="flex justify-between items-center mb-6">
      <a-button type="primary" @click="showAddDialog = true">
        <PlusOutlined />
        添加资源库
      </a-button>
    </div>

    <!-- 搜索和筛选 -->
    <div class="flex gap-4 mb-6">
      <a-input
        v-model:value="searchQuery"
        placeholder="搜索资源库..."
        class="w-64"
        allow-clear
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </a-input>
      
      <a-select v-model:value="statusFilter" placeholder="状态筛选" class="w-32" allow-clear>
        <a-select-option value="">全部</a-select-option>
        <a-select-option value="active">活跃</a-select-option>
        <a-select-option value="inactive">未活跃</a-select-option>
      </a-select>
    </div>

    <!-- 资源库列表 -->
    <a-skeleton v-if="loading && libraries.length === 0" active :paragraph="{ rows: 8 }" />
    
    <a-table
      v-else
      :loading="loading"
      :data-source="filteredLibraries"
      :row-key="(record: Library) => record.id"
      :row-selection="{ 
        selectedRowKeys: selectedLibraries, 
        onChange: handleSelectionChange 
      }"
      class="library-table"
    >
      <a-table-column title="名称" data-index="name" key="name" width="200">
        <template #default="{ record }">
          <div class="flex items-center">
            <FolderOutlined class="mr-2" />
            <span class="font-medium">{{ record.name }}</span>
          </div>
        </template>
      </a-table-column>
      
      <a-table-column title="路径" data-index="path" key="path" :ellipsis="true" />
      
      <a-table-column title="类型" data-index="type" key="type" width="100">
        <template #default="{ record }">
          <a-tag :color="record.type === 'local' ? 'green' : 'blue'">
            {{ record.type === 'local' ? '本地' : '远程' }}
          </a-tag>
        </template>
      </a-table-column>
      
      <a-table-column title="状态" data-index="status" key="status" width="100">
        <template #default="{ record }">
          <a-tag :color="record.status === 'active' ? 'green' : 'red'">
            {{ record.status === 'active' ? '活跃' : '未活跃' }}
          </a-tag>
        </template>
      </a-table-column>
      
      <a-table-column title="文件数" data-index="fileCount" key="fileCount" width="100" />
      
      <a-table-column title="大小" data-index="size" key="size" width="120">
        <template #default="{ record }">
          {{ formatFileSize(record.size) }}
        </template>
      </a-table-column>
      
      <a-table-column title="操作" key="action" width="200" fixed="right">
        <template #default="{ record }">
          <a-space>
            <a-button size="small" @click="editLibrary(record)">编辑</a-button>
            <a-button size="small" type="primary" @click="toggleStatus(record)">
              {{ record.status === 'active' ? '禁用' : '启用' }}
            </a-button>
            <a-button 
              size="small" 
              danger 
              :disabled="record.status === 'active'"
              @click="deleteLibrary(record)"
            >
              删除
            </a-button>
          </a-space>
        </template>
      </a-table-column>
    </a-table>

    <!-- 添加/编辑对话框 -->
    <a-modal
      v-model:open="showAddDialog"
      :title="editingLibrary ? '编辑资源库' : '添加资源库'"
      width="500px"
      @ok="saveLibrary"
      @cancel="cancelEdit"
    >
      <a-form
        ref="libraryFormRef"
        :model="libraryForm"
        :rules="libraryRules"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-form-item label="名称" name="name">
          <a-input v-model:value="libraryForm.name" placeholder="请输入资源库名称" />
        </a-form-item>
        
        <a-form-item label="路径" name="path">
          <a-input v-model:value="libraryForm.path" placeholder="请输入资源库路径" />
        </a-form-item>
        
        <a-form-item label="类型" name="type">
          <a-select v-model:value="libraryForm.type" style="width: 100%">
            <a-select-option value="local">本地</a-select-option>
            <a-select-option value="remote">远程</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="图标">
          <a-input v-model:value="libraryForm.icon" placeholder="图标名称（默认：default）" />
        </a-form-item>

        <a-form-item label="启用哈希">
          <a-switch v-model:checked="libraryForm.enableHash" />
          <span class="ml-2 text-gray-500">启用文件哈希校验</span>
        </a-form-item>

        <!-- 远程库相关配置 -->
        <template v-if="libraryForm.type === 'remote'">
          <a-form-item label="服务器地址" name="serverURL">
            <a-input v-model:value="libraryForm.serverURL" placeholder="例如：http://127.0.0.1" />
          </a-form-item>

          <a-form-item label="服务器端口" name="serverPort">
            <a-input v-model:value="libraryForm.serverPort" placeholder="例如：3000" />
          </a-form-item>
        </template>

        <a-form-item label="插件目录">
          <a-input v-model:value="libraryForm.pluginsDir" placeholder="插件目录路径（可选）" />
        </a-form-item>
        
        <a-form-item label="描述">
          <a-textarea
            v-model:value="libraryForm.description"
            placeholder="请输入描述（可选）"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { PlusOutlined, SearchOutlined, FolderOutlined } from '@ant-design/icons-vue'
import { ref, computed, onMounted } from 'vue'
import { message, Modal, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import type { Library } from '@/types'
import { api } from '@/utils/api'

const loading = ref(false)
const showAddDialog = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const selectedLibraries = ref<string[]>([])
const editingLibrary = ref<Library | null>(null)
const libraryFormRef = ref<FormInstance>()

const libraries = ref<Library[]>([])

const libraryForm = ref({
  name: '',
  path: '',
  type: 'local' as 'local' | 'remote',
  description: '',
  icon: 'default',
  enableHash: false,
  serverURL: '',
  serverPort: '',
  pluginsDir: ''
})

const libraryRules: Record<string, Rule[]> = {
  name: [
    { required: true, message: '请输入资源库名称', trigger: 'blur' }
  ],
  path: [
    { required: true, message: '请输入资源库路径', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择资源库类型', trigger: 'change' }
  ],
  serverURL: [
    { 
      required: true, 
      message: '请输入服务器地址', 
      trigger: 'blur',
      validator: (_rule: any, value: string) => {
        if (libraryForm.value.type === 'remote' && !value) {
          return Promise.reject('远程库需要填写服务器地址')
        }
        return Promise.resolve()
      }
    }
  ],
  serverPort: [
    { 
      required: true, 
      message: '请输入服务器端口', 
      trigger: 'blur',
      validator: (_rule: any, value: string) => {
        if (libraryForm.value.type === 'remote' && !value) {
          return Promise.reject('远程库需要填写服务器端口')
        }
        if (value && (isNaN(Number(value)) || Number(value) < 1 || Number(value) > 65535)) {
          return Promise.reject('端口号必须是1-65535之间的数字')
        }
        return Promise.resolve()
      }
    }
  ]
}

const filteredLibraries = computed(() => {
  return libraries.value.filter(library => {
    const searchLower = searchQuery.value.toLowerCase()
    const matchesSearch = !searchQuery.value || 
                         library.name.toLowerCase().includes(searchLower) ||
                         (library.path && library.path.toLowerCase().includes(searchLower)) ||
                         (library.description && library.description.toLowerCase().includes(searchLower))
    const matchesStatus = !statusFilter.value || library.status === statusFilter.value
    return matchesSearch && matchesStatus
  })
})

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const loadLibraries = async () => {
  loading.value = true
  try {
    const response = await api.get('/api/libraries')
    libraries.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    message.error('加载资源库列表失败')
    console.error('Failed to load libraries:', error)
    libraries.value = []
  } finally {
    loading.value = false
  }
}

const handleSelectionChange = (selectedRowKeys: (string | number)[]) => {
  selectedLibraries.value = selectedRowKeys as string[]
}

const editLibrary = (library: Library) => {
  editingLibrary.value = library
  libraryForm.value = {
    name: library.name,
    path: library.path,
    type: library.type,
    description: library.description || '',
    icon: (library as any).icon || 'default',
    enableHash: (library as any).customFields?.enableHash || false,
    serverURL: (library as any).serverURL || '',
    serverPort: (library as any).serverPort || '',
    pluginsDir: (library as any).pluginsDir || ''
  }
  showAddDialog.value = true
}

const cancelEdit = () => {
  showAddDialog.value = false
  editingLibrary.value = null
  libraryForm.value = { 
    name: '', 
    path: '', 
    type: 'local', 
    description: '',
    icon: 'default',
    enableHash: false,
    serverURL: '',
    serverPort: '',
    pluginsDir: ''
  }
}

const saveLibrary = async () => {
  if (!libraryFormRef.value) return
  
  try {
    await libraryFormRef.value.validate()
    
    // 构建提交数据，符合后端期望的格式
    const submitData = {
      name: libraryForm.value.name,
      path: libraryForm.value.path,
      type: libraryForm.value.type,
      description: libraryForm.value.description,
      icon: libraryForm.value.icon,
      customFields: {
        path: libraryForm.value.path,
        enableHash: libraryForm.value.enableHash
      },
      ...(libraryForm.value.type === 'remote' && {
        serverURL: libraryForm.value.serverURL,
        serverPort: libraryForm.value.serverPort
      }),
      ...(libraryForm.value.pluginsDir && {
        pluginsDir: libraryForm.value.pluginsDir
      })
    }
    
    if (editingLibrary.value) {
      // 更新资源库
      await api.put(`/api/libraries/${editingLibrary.value.id}`, submitData)
      message.success('资源库更新成功')
    } else {
      // 添加资源库
      await api.post('/api/libraries', submitData)
      message.success('资源库添加成功')
    }
    
    cancelEdit()
    loadLibraries()
  } catch (error: any) {
    if (error.response?.data?.message) {
      message.error(error.response.data.message)
    } else {
      message.error('操作失败')
    }
  }
}

const toggleStatus = async (library: Library) => {
  try {
    const newStatus = library.status === 'active' ? 'inactive' : 'active'
    await api.patch(`/api/libraries/${library.id}/status`, { status: newStatus })
    
    // 更新本地状态
    const index = libraries.value.findIndex(lib => lib.id === library.id)
    if (index !== -1) {
      libraries.value[index].status = newStatus
    }
    
    message.success(`资源库已${newStatus === 'active' ? '启用' : '禁用'}`)
  } catch (error: any) {
    console.error('Toggle status error:', error)
    if (error.response?.data?.error) {
      message.error(error.response.data.error)
    } else {
      message.error('状态切换失败')
    }
  }
}

const deleteLibrary = async (library: Library) => {
  // 检查是否是激活状态，如果是，则不允许删除
  if (library.status === 'active') {
    message.warning('请先禁用资源库再进行删除操作')
    return
  }
  
  try {
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除资源库 "${library.name}" 吗？此操作不可撤销。`,
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          resolve(true)
        },
        onCancel: () => {
          resolve(false)
        }
      } as any)
    })
    
    if (!confirmed) {
      return // 用户取消操作
    }
    
    await api.delete(`/api/libraries/${library.id}`)
    message.success('资源库删除成功')
    loadLibraries()
  } catch (error: any) {
    console.error('Delete library error:', error)
    if (error.response?.data?.error) {
      message.error(error.response.data.error)
    } else {
      message.error('删除失败')
    }
  }
}

onMounted(() => {
  loadLibraries()
})
</script>

<style scoped>

.library-table {
  background: white;
  border-radius: 8px;
}
</style>
