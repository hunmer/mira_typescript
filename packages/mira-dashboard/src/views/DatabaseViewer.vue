<template>
  <div class="database-viewer">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">SQLite数据库预览</h1>
      <div class="flex gap-2">
        <a-button @click="refreshTables">
          <ReloadOutlined />
          刷新
        </a-button>
        <a-button type="primary" @click="showSqlDialog = true">
          <EditOutlined />
          SQL查询
        </a-button>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-6">
      <!-- 数据库表列表 -->
      <div class="col-span-3">
        <a-card class="table-list">
          <template #title>
            <div class="flex items-center">
              <DatabaseOutlined class="mr-2" />
              <span class="font-semibold">数据库表</span>
            </div>
          </template>
          
          <div class="space-y-2">
            <div
              v-for="table in tables"
              :key="table.name"
              class="table-item"
              :class="{ active: selectedTable?.name === table.name }"
              @click="selectTable(table)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <AppstoreOutlined class="mr-2 text-blue-500" />
                  <span class="text-sm font-medium">{{ table.name }}</span>
                </div>
                <span class="text-xs text-gray-500">{{ table.rowCount }}</span>
              </div>
            </div>
          </div>
        </a-card>
      </div>

      <!-- 表数据显示 -->
      <div class="col-span-9">
        <a-card v-if="selectedTable" class="table-data">
          <template #title>
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <AppstoreOutlined class="mr-2" />
                <span class="font-semibold">{{ selectedTable.name }}</span>
                <a-tag size="small" class="ml-2">{{ tableData.length }} 行</a-tag>
              </div>
              <div class="flex gap-2">
                <a-button size="small" @click="exportTable">
                  <DownloadOutlined />
                  导出
                </a-button>
                <a-button size="small" type="primary" @click="showAddRowDialog = true">
                  <PlusOutlined />
                  新增行
                </a-button>
              </div>
            </div>
          </template>
          
          <div class="table-content">
            <!-- 表结构信息 -->
            <el-collapse :value="activeCollapse" class="mb-4">
              <el-collapse-item title="表结构" name="schema">
                <a-table :data="tableSchema" size="small">
                  <a-table-column name="name" label="字段名" width="150" />
                  <a-table-column name="type" label="类型" width="100" />
                  <a-table-column name="notnull" label="非空" width="80">
                    <template #default="{ row }">
                      <a-tag :type="row.notnull ? 'success' : 'info'" size="small">
                        {{ row.notnull ? '是' : '否' }}
                      </a-tag>
                    </template>
                  </a-table-column>
                  <a-table-column name="pk" label="主键" width="80">
                    <template #default="{ row }">
                      <a-tag v-if="row.pk" type="primary" size="small">主键</a-tag>
                    </template>
                  </a-table-column>
                  <a-table-column name="dflt_value" label="默认值" />
                </a-table>
              </el-collapse-item>
            </el-collapse>

            <!-- 表数据 -->
            <a-table
              :loading="loadingData"
              :data="paginatedData"
              class="data-table"
              max-height="500"
            >
              <a-table-column
                v-for="column in tableColumns"
                :key="column"
                :name="column"
                :label="column"
                min-width="120"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  <span v-if="row[column] === null" class="text-gray-400 italic">NULL</span>
                  <span v-else>{{ row[column] }}</span>
                </template>
              </a-table-column>
              
              <a-table-column label="操作" width="150" fixed="right">
                <template #default="{ row, $index }">
                  <a-button size="small" @click="editRow(row, $index)">编辑</a-button>
                  <a-button size="small" danger @click="deleteRow(row, $index)">删除</a-button>
                </template>
              </a-table-column>
            </a-table>

            <!-- 分页 -->
            <el-pagination
              v-if="tableData.length > pageSize"
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="tableData.length"
              :page-sizes="[20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next, jumper"
              class="mt-4"
            />
          </div>
        </a-card>
        
        <el-empty v-else description="请选择一个表" />
      </div>
    </div>

    <!-- SQL查询对话框 -->
    <a-modal v-model:open="showSqlDialog" title="SQL查询" width="800px">
      <div class="sql-editor mb-4">
        <monaco-editor
          :model-value="sqlQuery"
          @update:model-value="sqlQuery = $event"
          language="sql"
          :height="200"
          :options="{ theme: 'vs-dark' }"
        />
      </div>
      
      <div class="flex gap-2 mb-4">
        <a-button type="primary" @click="executeSql">执行查询</a-button>
        <a-button @click="sqlQuery = ''">清空</a-button>
      </div>
      
      <div v-if="sqlResult.length > 0" class="sql-result">
        <h4 class="mb-2">查询结果：</h4>
        <a-table :data="sqlResult" max-height="300" size="small">
          <a-table-column
            v-for="column in sqlResultColumns"
            :key="column"
            :name="column"
            :label="column"
            min-width="100"
          />
        </a-table>
      </div>
    </a-modal>

    <!-- 新增/编辑行对话框 -->
    <a-modal
      :value="showAddRowDialog"
      :title="editingRowIndex !== -1 ? '编辑行' : '新增行'"
      width="600px"
    >
      <a-form
        ref="rowFormRef"
        :model="rowForm"
        label-width="120px"
      >
        <a-form-item
          v-for="column in tableColumns"
          :key="column"
          :label="column"
        >
          <a-input
            :value="rowForm[column]"
            :placeholder="`请输入${column}`"
          />
        </a-form-item>
      </a-form>
      
      <template #footer>
        <a-button @click="showAddRowDialog = false">取消</a-button>
        <a-button type="primary" @click="saveRow">保存</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ReloadOutlined, EditOutlined, DatabaseOutlined, AppstoreOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { ref, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { DatabaseTable, DatabaseRow } from '@/types'
import { api } from '@/utils/api'
import MonacoEditor from '@/components/MonacoEditor.vue'

const loadingData = ref(false)
const showSqlDialog = ref(false)
const showAddRowDialog = ref(false)
const selectedTable = ref<DatabaseTable | null>(null)
const activeCollapse = ref(['schema'])
const currentPage = ref(1)
const pageSize = ref(50)
const editingRowIndex = ref(-1)

const tables = ref<DatabaseTable[]>([])
const tableData = ref<DatabaseRow[]>([])
const tableSchema = ref<any[]>([])
const sqlQuery = ref('')
const sqlResult = ref<DatabaseRow[]>([])
const rowForm = ref<DatabaseRow>({})

const tableColumns = computed(() => {
  if (tableData.value.length === 0) return []
  return Object.keys(tableData.value[0])
})

const sqlResultColumns = computed(() => {
  if (sqlResult.value.length === 0) return []
  return Object.keys(sqlResult.value[0])
})

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return tableData.value.slice(start, end)
})

const loadTables = async () => {
  try {
    const response = await api.get('/api/database/tables')
    tables.value = response.data as any
  } catch (error) {
    message.error('加载数据库表失败')
    console.error('Failed to load database tables:', error)
    tables.value = []
  }
}

const selectTable = async (table: DatabaseTable) => {
  selectedTable.value = table
  await Promise.all([loadTableData(table.name), loadTableSchema(table.name)])
}

const loadTableData = async (tableName: string) => {
  loadingData.value = true
  try {
    const response = await api.get(`/api/database/tables/${tableName}/data`)
    tableData.value = response.data as any
  } catch (error) {
    message.error('加载表数据失败')
    console.error('Failed to load table data:', error)
    tableData.value = []
  } finally {
    loadingData.value = false
  }
}

const loadTableSchema = async (tableName: string) => {
  try {
    const response = await api.get(`/api/database/tables/${tableName}/schema`)
    tableSchema.value = response.data as any
  } catch (error) {
    console.error('Failed to load table schema:', error)
    tableSchema.value = []
  }
}

const refreshTables = () => {
  loadTables()
  if (selectedTable.value) {
    selectTable(selectedTable.value)
  }
}

const executeSql = async () => {
  if (!sqlQuery.value.trim()) {
    message.warning('请输入SQL查询语句')
    return
  }
  
  try {
    const response = await api.post('/database/query', { sql: sqlQuery.value })
    sqlResult.value = response.data as any
    message.success('查询执行成功')
  } catch (error: any) {
    message.error(error.response?.data?.message || 'SQL执行失败')
  }
}

const editRow = (row: DatabaseRow, index: number) => {
  editingRowIndex.value = index
  rowForm.value = { ...row }
  showAddRowDialog.value = true
}

const saveRow = async () => {
  if (!selectedTable.value) return
  
  try {
    if (editingRowIndex.value !== -1) {
      // 更新行
      await api.put(`/database/tables/${selectedTable.value.name}/rows`, rowForm.value)
      message.success('行更新成功')
    } else {
      // 新增行
      await api.post(`/database/tables/${selectedTable.value.name}/rows`, rowForm.value)
      message.success('行添加成功')
    }
    
    showAddRowDialog.value = false
    editingRowIndex.value = -1
    rowForm.value = {}
    loadTableData(selectedTable.value.name)
  } catch (error: any) {
    message.error(error.response?.data?.message || '操作失败')
  }
}

const deleteRow = async (row: DatabaseRow, _index: number) => {
  if (!selectedTable.value) return
  
  try {
    await Modal.confirm({
  title: '确认删除',
  content: '确定要删除这一行数据吗？',
  okText: '确定',
  cancelText: '取消'
})
    
    await api.delete(`/database/tables/${selectedTable.value.name}/rows`, { 
      data: row,
      headers: { 'Content-Type': 'application/json' }
    } as any)
    message.success('行删除成功')
    loadTableData(selectedTable.value.name)
  } catch (error: any) {
    if (error !== 'cancel') {
      message.error('删除失败')
    }
  }
}

const exportTable = async () => {
  if (!selectedTable.value) return
  
  try {
    const response = await api.get(`/database/tables/${selectedTable.value.name}/export`, {
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data as string]))
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedTable.value.name}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    message.success('导出成功')
  } catch (error) {
    message.error('导出失败')
  }
}

onMounted(() => {
  loadTables()
})
</script>

<style scoped>
.database-viewer {
  max-width: 1400px;
}

.table-list {
  height: 600px;
  overflow-y: auto;
}

.table-item {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.table-item:hover {
  background-color: #f5f5f5;
}

.table-item.active {
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
}

.table-data {
  min-height: 600px;
}

.table-content {
  min-height: 400px;
}

.sql-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.sql-result {
  border-top: 1px solid #ebeef5;
  padding-top: 16px;
}
</style>
