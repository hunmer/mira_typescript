<template>
  <div class="library-viewer">
    <div class="flex justify-between items-center mb-6">
      <div class="flex gap-2">
        <a-button @click="refreshLibraries">
          <ReloadOutlined />
          刷新
        </a-button>
        <a-button type="primary" @click="showSqlDialog = true" :disabled="!selectedLibrary">
          <EditOutlined />
          SQL查询
        </a-button>
      </div>
    </div>

    <!-- 资源库Tab切换 -->
    <a-tabs v-model:activeKey="activeLibraryKey" @change="onLibraryChange" class="mb-6">
      <a-tab-pane
        v-for="library in libraries"
        :key="library.id"
        :tab="library.name"
      >
        <div class="library-content">
          <!-- 资源库统计信息 -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <a-card size="small">
              <a-statistic
                title="总文件数"
                :value="libraryStats.totalFiles"
                :value-style="{ color: '#3f8600' }"
              />
            </a-card>
            <a-card size="small">
              <a-statistic
                title="文件夹数"
                :value="libraryStats.totalFolders"
                :value-style="{ color: '#1890ff' }"
              />
            </a-card>
            <a-card size="small">
              <a-statistic
                title="总大小"
                :value="formatFileSize(libraryStats.totalSize)"
                :value-style="{ color: '#cf1322' }"
              />
            </a-card>
            <a-card size="small">
              <a-statistic
                title="标签数"
                :value="libraryStats.totalTags"
                :value-style="{ color: '#722ed1' }"
              />
            </a-card>
          </div>

          <!-- 表格选择和过滤 -->
          <div class="flex gap-4 mb-6">
            <a-select 
              v-model:value="selectedTable" 
              placeholder="选择表格" 
              class="w-48"
              @change="loadTableData"
            >
              <a-select-option
                v-for="table in availableTables"
                :key="table"
                :value="table"
              >
                {{ table }}
              </a-select-option>
            </a-select>
            
            <!-- 列过滤器 -->
            <div class="flex gap-2 flex-wrap">
              <div v-for="column in dynamicColumns" :key="column.key" class="flex items-center gap-2">
                <span class="text-sm text-gray-600">{{ column.title }}:</span>
                <a-input 
                  v-model:value="columnFilters[column.key]"
                  :placeholder="`过滤 ${column.title}`"
                  class="w-32"
                  size="small"
                  allow-clear
                  @change="applyFilters"
                />
              </div>
              <a-button size="small" @click="clearFilters">清除过滤</a-button>
            </div>
          </div>

          <!-- 文件列表表格 -->
          <a-table
            :loading="loadingData"
            :dataSource="tableData"
            :pagination="pagination"
            @change="handleTableChange"
            class="library-table"
            :scroll="{ x: 1000, y: 500 }"
            row-key="id"
          >
            <a-table-column
              v-for="column in dynamicColumns"
              :key="column.key"
              :title="column.title"
              :dataIndex="column.dataIndex"
              :width="column.width"
              :ellipsis="column.ellipsis"
            >
              <template #default="{ record }">
                <span v-if="record[column.dataIndex] === null" class="text-gray-400 italic">NULL</span>
                <span v-else>{{ formatColumnValue(record[column.dataIndex], column.type) }}</span>
              </template>
            </a-table-column>
            
            <!-- 操作列 -->
            <a-table-column title="操作" key="operation" :width="120" fixed="right">
              <template #default="{ record }">
                <a-button size="small" type="primary" @click="editRecord(record)">编辑</a-button>
              </template>
            </a-table-column>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 编辑记录对话框 -->
    <a-modal 
      v-model:open="showEditDialog" 
      title="编辑记录" 
      width="600px" 
      @ok="saveEditRecord"
      @cancel="cancelEdit"
    >
      <div v-if="editingRecord">
        <a-form layout="vertical">
          <a-form-item 
            v-for="column in dynamicColumns" 
            :key="column.key"
            :label="column.title"
          >
            <a-input 
              v-if="column.key !== 'id'"
              v-model:value="editingRecord[column.key]"
              :placeholder="`请输入${column.title}`"
            />
            <a-input 
              v-else
              v-model:value="editingRecord[column.key]"
              disabled
              placeholder="ID 不可编辑"
            />
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- SQL查询对话框 -->
    <a-modal v-model:open="showSqlDialog" title="资源库SQL查询" width="800px" @ok="executeSql">
      <div class="mb-4">
        <p class="text-gray-600 mb-2">
          当前查询资源库: <strong>{{ selectedLibrary?.name }}</strong>
        </p>
      </div>
      
      <div class="sql-editor mb-4">
        <monaco-editor
          v-model:modelValue="sqlQuery"
          language="sql"
          :height="200"
          :options="{ theme: 'vs-dark' }"
        />
      </div>
      
      <div class="flex gap-2 mb-4">
        <a-button type="primary" @click="executeSql">执行查询</a-button>
        <a-button @click="sqlQuery = ''">清空</a-button>
        <a-dropdown>
          <template #overlay>
            <a-menu @click="insertSqlTemplate">
              <a-menu-item key="files">查询所有文件</a-menu-item>
              <a-menu-item key="images">查询图片文件</a-menu-item>
              <a-menu-item key="videos">查询视频文件</a-menu-item>
              <a-menu-item key="large">查询大文件</a-menu-item>
              <a-menu-item key="recent">查询最近文件</a-menu-item>
            </a-menu>
          </template>
          <a-button>
            模板查询 <DownOutlined />
          </a-button>
        </a-dropdown>
      </div>
      
      <div v-if="sqlResult.length > 0" class="sql-result">
        <h4 class="mb-2">查询结果：({{ sqlResult.length }} 条记录)</h4>
        <a-table 
          :dataSource="sqlResult" 
          :columns="sqlResultColumns"
          :scroll="{ x: 800, y: 300 }"
          size="small"
          :pagination="{ pageSize: 10 }"
        />
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ReloadOutlined, EditOutlined, DownOutlined } from '@ant-design/icons-vue'
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { Library } from '@/types'
import { api } from '@/utils/api'
import MonacoEditor from '@/components/MonacoEditor.vue'

// 响应式数据
const loadingData = ref(false)
const showSqlDialog = ref(false)
const activeLibraryKey = ref<string>('')
const selectedTable = ref('')
const showEditDialog = ref(false)
const editingRecord = ref<any>(null)
const columnFilters = ref<{[key: string]: string}>({})

// 动态列配置
const dynamicColumns = ref<any[]>([])

// 表格数据和可用表格
const tableData = ref<any[]>([])
const availableTables = ref(['files', 'tags', 'folders'])

// 数据
const libraries = ref<Library[]>([])
const libraryStats = ref({
  totalFiles: 0,
  totalFolders: 0,
  totalSize: 0,
  totalTags: 0
})
const sqlQuery = ref('')
const sqlResult = ref<any[]>([])

// 分页配置
const pagination = ref({
  current: 1,
  pageSize: 50,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
  pageSizeOptions: ['20', '50', '100', '200']
})

// 计算属性
const selectedLibrary = computed(() => {
  return libraries.value.find(lib => lib.id === activeLibraryKey.value)
})

const sqlResultColumns = computed(() => {
  if (sqlResult.value.length === 0) return []
  return Object.keys(sqlResult.value[0]).map(key => ({
    title: key,
    dataIndex: key,
    key,
    width: 120,
    ellipsis: true
  }))
})

// SQL模板
const sqlTemplates = {
  files: 'SELECT * FROM files WHERE type = "file" LIMIT 100',
  images: 'SELECT * FROM files WHERE fileType LIKE "image%" LIMIT 100',
  videos: 'SELECT * FROM files WHERE fileType LIKE "video%" LIMIT 100',
  large: 'SELECT * FROM files WHERE size > 100000000 ORDER BY size DESC LIMIT 50',
  recent: 'SELECT * FROM files WHERE modifiedAt > datetime("now", "-7 days") ORDER BY modifiedAt DESC LIMIT 100'
}

// 方法
const loadLibraries = async () => {
  try {
    const response = await api.get('/api/libraries')
    libraries.value = Array.isArray(response.data) ? response.data : []
    
    if (libraries.value.length > 0 && !activeLibraryKey.value) {
      activeLibraryKey.value = libraries.value[0].id
    }
  } catch (error) {
    message.error('加载资源库列表失败')
    console.error('Failed to load libraries:', error)
    libraries.value = []
  }
}

const loadLibraryData = async (page = 1, pageSize = 50) => {
  if (!selectedLibrary.value || !selectedTable.value) return
  
  loadingData.value = true
  try {
    // 第一次查询：获取表结构
    const schemaResponse = await api.get(`/api/libraries/${selectedLibrary.value.id}/schema/${selectedTable.value}`)
    const schemaData = schemaResponse.data as any
    
    if (schemaData.success && schemaData.data) {
      // 根据表结构生成动态列配置
      dynamicColumns.value = schemaData.data.map((column: any) => ({
        key: column.name,
        title: column.name,
        dataIndex: column.name,
        width: 150,
        ellipsis: true,
        type: column.type
      }))
    }
    
    // 构建过滤条件
    const whereConditions = []
    for (const [column, value] of Object.entries(columnFilters.value)) {
      if (value && typeof value === 'string' && value.trim()) {
        whereConditions.push(`${column} LIKE '%${value.trim()}%'`)
      }
    }
    const whereClause = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : ''
    
    // 先获取总数
    const countResponse = await api.post(`/api/libraries/${selectedLibrary.value.id}/query`, { 
      sql: `SELECT COUNT(*) as total FROM ${selectedTable.value}${whereClause}` 
    })
    const countData = countResponse.data as any
    const total = countData.success && countData.data?.[0]?.total || 0
    
    // 第二次查询：获取分页数据
    const offset = (page - 1) * pageSize
    const sqlQuery = `SELECT * FROM ${selectedTable.value}${whereClause} LIMIT ${pageSize} OFFSET ${offset}`
    const dataResponse = await api.post(`/api/libraries/${selectedLibrary.value.id}/query`, { sql: sqlQuery })
    const queryData = dataResponse.data as any
    
    if (queryData.success) {
      tableData.value = queryData.data || []
      pagination.value.current = page
      pagination.value.pageSize = pageSize
      pagination.value.total = total
    }
    
    // 加载统计信息
    await loadLibraryStats()
  } catch (error) {
    message.error('加载资源库数据失败')
    console.error('Failed to load library data:', error)
  } finally {
    loadingData.value = false
  }
}

const loadLibraryStats = async () => {
  if (!selectedLibrary.value) return
  
  try {
    const response = await api.get(`/api/libraries/${selectedLibrary.value.id}/stats`)
    libraryStats.value = response.data as any
  } catch (error) {
    console.error('Failed to load library stats:', error)
    libraryStats.value = {
      totalFiles: 0,
      totalFolders: 0,
      totalSize: 0,
      totalTags: 0
    }
  }
}

const onLibraryChange = (key: string) => {
  activeLibraryKey.value = key
  pagination.value.current = 1
  // 默认选择第一个表格
  if (!selectedTable.value && availableTables.value.length > 0) {
    selectedTable.value = availableTables.value[0]
  }
  if (selectedTable.value) {
    loadLibraryData()
  }
}

const handleTableChange = (paginationInfo: any) => {
  loadLibraryData(paginationInfo.current, paginationInfo.pageSize)
}

const refreshLibraries = () => {
  loadLibraries()
  if (selectedLibrary.value) {
    loadLibraryData()
  }
}

const executeSql = async () => {
  if (!sqlQuery.value.trim()) {
    message.warning('请输入SQL查询语句')
    return
  }
  
  if (!selectedLibrary.value) {
    message.warning('请先选择一个资源库')
    return
  }
  
  try {
    const response = await api.post(`/api/libraries/${selectedLibrary.value.id}/query`, { 
      sql: sqlQuery.value 
    })
    sqlResult.value = response.data as any
    message.success(`查询执行成功，返回 ${sqlResult.value.length} 条记录`)
  } catch (error: any) {
    message.error(error.response?.data?.message || 'SQL执行失败')
  }
}

const insertSqlTemplate = ({ key }: { key: string }) => {
  sqlQuery.value = sqlTemplates[key as keyof typeof sqlTemplates] || ''
}

// 加载表格数据的方法
const loadTableData = async () => {
  // 调用 loadLibraryData 来统一处理
  await loadLibraryData()
}

// 格式化列值
const formatColumnValue = (value: any, type: string) => {
  if (value === null || value === undefined) return 'NULL'
  if (type === 'number' && typeof value === 'number') {
    return value.toLocaleString()
  }
  if (type === 'string' && typeof value === 'string' && value.length > 50) {
    return value.substring(0, 50) + '...'
  }
  return String(value)
}

// 编辑相关方法
const editRecord = (record: any) => {
  editingRecord.value = { ...record }
  showEditDialog.value = true
}

const cancelEdit = () => {
  editingRecord.value = null
  showEditDialog.value = false
}

const saveEditRecord = async () => {
  if (!editingRecord.value || !selectedLibrary.value || !selectedTable.value) return
  
  try {
    // 使用新的更新接口
    const response = await api.put(
      `/api/libraries/${selectedLibrary.value.id}/record/${selectedTable.value}/${editingRecord.value.id}`,
      editingRecord.value
    )
    const result = response.data as any
    
    if (result.success) {
      message.success('记录更新成功')
      showEditDialog.value = false
      editingRecord.value = null
      // 重新加载当前页数据
      loadLibraryData(pagination.value.current, pagination.value.pageSize)
    }
  } catch (error) {
    message.error('更新记录失败')
    console.error('Failed to update record:', error)
  }
}

// 过滤相关方法
const applyFilters = () => {
  // 重置到第一页并应用过滤
  loadLibraryData(1, pagination.value.pageSize)
}

const clearFilters = () => {
  columnFilters.value = {}
  loadLibraryData(1, pagination.value.pageSize)
}


// 工具函数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 监听器
watch(() => selectedLibrary.value, (newLib) => {
  if (newLib) {
    loadLibraryData()
  }
}, { immediate: true })

// 生命周期
onMounted(() => {
  loadLibraries()
})
</script>

<style scoped>
.library-viewer {
  max-width: 1400px;
  padding: 20px;
}

.library-table {
  background: white;
  border-radius: 8px;
}

.library-content {
  min-height: 600px;
}

.sql-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.sql-result {
  border-top: 1px solid #ebeef5;
  padding-top: 16px;
}

.ant-tabs-content-holder {
  padding: 16px 0;
}

.ant-statistic-title {
  font-size: 14px;
  color: #666;
}

.ant-statistic-content {
  font-size: 20px;
  font-weight: 600;
}
</style>
