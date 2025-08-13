<template>
  <div class="library-manager">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">资源库管理器</h1>
      <a-button type="primary" @click="showAddDialog = true">
        <PlusOutlined />
        添加资源库
      </a-button>
    </div>

    <!-- 搜索和筛选 -->
    <div class="flex gap-4 mb-6">
      <a-input
        :value="searchQuery"
        placeholder="搜索资源库..."
        class="w-64"
        clearable
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </a-input>
      
      <a-select v-model:value="statusFilter" placeholder="状态筛选" class="w-32">
        <a-option label="全部" value="" />
        <a-option label="活跃" value="active" />
        <a-option label="未活跃" value="inactive" />
      </a-select>
    </div>

    <!-- 资源库列表 -->
    <a-table
      :loading="loading"
      :data="filteredLibraries"
      class="library-table"
      @selection-change="handleSelectionChange"
    >
      <a-table-column type="selection" width="55" />
      
      <a-table-column name="name" label="名称" min-width="150">
        <template #default="{ row }">
          <div class="flex items-center">
            <FolderOutlined class="mr-2" />
            <span class="font-medium">{{ row.name }}</span>
          </div>
        </template>
      </a-table-column>
      
      <a-table-column name="path" label="路径" min-width="200" show-overflow-tooltip />
      
      <a-table-column name="type" label="类型" width="100">
        <template #default="{ row }">
          <a-tag :type="row.type === 'local' ? 'success' : 'info'" size="small">
            {{ row.type === 'local' ? '本地' : '远程' }}
          </a-tag>
        </template>
      </a-table-column>
      
      <a-table-column name="status" label="状态" width="100">
        <template #default="{ row }">
          <a-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
            {{ row.status === 'active' ? '活跃' : '未活跃' }}
          </a-tag>
        </template>
      </a-table-column>
      
      <a-table-column name="fileCount" label="文件数" width="100" />
      
      <a-table-column name="size" label="大小" width="100">
        <template #default="{ row }">
          {{ formatFileSize(row.size) }}
        </template>
      </a-table-column>
      
      <a-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <a-button size="small" @click="editLibrary(row)">编辑</a-button>
          <a-button size="small" type="primary" @click="toggleStatus(row)">
            {{ row.status === 'active' ? '禁用' : '启用' }}
          </a-button>
          <a-button size="small" danger @click="deleteLibrary(row)">删除</a-button>
        </template>
      </a-table-column>
    </a-table>

    <!-- 添加/编辑对话框 -->
    <a-modal
      :value="showAddDialog"
      :title="editingLibrary ? '编辑资源库' : '添加资源库'"
      width="500px"
    >
      <a-form
        ref="libraryFormRef"
        :model="libraryForm"
        :rules="libraryRules"
        label-width="80px"
      >
        <a-form-item label="名称" name="name">
          <a-input :value="libraryForm.name" placeholder="请输入资源库名称" />
        </a-form-item>
        
        <a-form-item label="路径" name="path">
          <a-input :value="libraryForm.path" placeholder="请输入资源库路径" />
        </a-form-item>
        
        <a-form-item label="类型" name="type">
          <a-select v-model:value="libraryForm.type" class="w-full">
            <a-option label="本地" value="local" />
            <a-option label="远程" value="remote" />
          </a-select>
        </a-form-item>
        
        <a-form-item label="描述">
          <a-input
            :value="libraryForm.description"
            type="textarea"
            placeholder="请输入描述（可选）"
            :rows="3"
          />
        </a-form-item>
      </a-form>
      
      <template #footer>
        <a-button @click="showAddDialog = false">取消</a-button>
        <a-button type="primary" @click="saveLibrary">确定</a-button>
      </template>
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
const selectedLibraries = ref<Library[]>([])
const editingLibrary = ref<Library | null>(null)
const libraryFormRef = ref<FormInstance>()

const libraries = ref<Library[]>([])

const libraryForm = ref({
  name: '',
  path: '',
  type: 'local' as 'local' | 'remote',
  description: ''
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
  ]
}

const filteredLibraries = computed(() => {
  return libraries.value.filter(library => {
    const matchesSearch = library.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         library.path.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = !statusFilter.value || library.status === statusFilter.value
    return matchesSearch && matchesStatus
  })
})

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const loadLibraries = async () => {
  loading.value = true
  try {
    const response = await api.get('/api/libraries')
    libraries.value = response.data as any
  } catch (error) {
    message.error('加载资源库列表失败')
    console.error('Failed to load libraries:', error)
    libraries.value = []
  } finally {
    loading.value = false
  }
}

const handleSelectionChange = (selection: Library[]) => {
  selectedLibraries.value = selection
}

const editLibrary = (library: Library) => {
  editingLibrary.value = library
  libraryForm.value = {
    name: library.name,
    path: library.path,
    type: library.type,
    description: library.description || ''
  }
  showAddDialog.value = true
}

const saveLibrary = async () => {
  if (!libraryFormRef.value) return
  
  try {
    await libraryFormRef.value.validate()
    
    if (editingLibrary.value) {
      // 更新资源库
      await api.put(`/libraries/${editingLibrary.value.id}`, libraryForm.value)
      message.success('资源库更新成功')
    } else {
      // 添加资源库
      await api.post('/libraries', libraryForm.value)
      message.success('资源库添加成功')
    }
    
    showAddDialog.value = false
    editingLibrary.value = null
    libraryForm.value = { name: '', path: '', type: 'local', description: '' }
    loadLibraries()
  } catch (error: any) {
    message.error(error.response?.data?.message || '操作失败')
  }
}

const toggleStatus = async (library: Library) => {
  try {
    const newStatus = library.status === 'active' ? 'inactive' : 'active'
    await api.patch(`/libraries/${library.id}/status`, { status: newStatus })
    library.status = newStatus
    message.success(`资源库已${newStatus === 'active' ? '启用' : '禁用'}`)
  } catch (error) {
    message.error('操作失败')
  }
}

const deleteLibrary = async (library: Library) => {
  try {
    await Modal.confirm({
      title: '确认删除',
      content: `确定要删除资源库 "${library.name}" 吗？此操作不可撤销。`,
      okText: '确定',
      cancelText: '取消'
    })
    
    await api.delete(`/libraries/${library.id}`)
    message.success('资源库删除成功')
    loadLibraries()
  } catch (error: any) {
    if (error !== 'cancel') {
      message.error('删除失败')
    }
  }
}

onMounted(() => {
  loadLibraries()
})
</script>

<style scoped>
.library-manager {
  max-width: 1200px;
}

.library-table {
  background: white;
  border-radius: 8px;
}
</style>
