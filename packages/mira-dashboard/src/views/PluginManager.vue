<template>
  <div class="plugin-manager">
    <div class="flex justify-between items-center mb-6">
      <a-button type="primary" @click="showInstallDialog = true">
        <DownloadOutlined />
        安装插件
      </a-button>
    </div>

    <!-- 总体统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="stats-card total-plugins">
        <div class="stats-content">
          <div class="stats-icon">
            <AppstoreOutlined />
          </div>
          <div class="stats-info">
            <h3>总插件数</h3>
            <p class="stats-number">{{ totalPluginsCount }}</p>
          </div>
        </div>
      </div>
      
      <div class="stats-card active-plugins">
        <div class="stats-content">
          <div class="stats-icon">
            <AppstoreOutlined />
          </div>
          <div class="stats-info">
            <h3>已启用</h3>
            <p class="stats-number">{{ activePluginsCount }}</p>
          </div>
        </div>
      </div>
      
      <div class="stats-card inactive-plugins">
        <div class="stats-content">
          <div class="stats-icon">
            <AppstoreOutlined />
          </div>
          <div class="stats-info">
            <h3>已禁用</h3>
            <p class="stats-number">{{ inactivePluginsCount }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 素材库标签页 -->
    <a-tabs 
      v-model:activeKey="activeLibraryTab" 
      type="card" 
      size="large"
      class="library-tabs"
    >
      <a-tab-pane 
        v-for="library in librariesWithPlugins" 
        :key="library.id" 
        :tab="library.name || library.id"
      >
        <!-- 当前库的搜索和排序控制栏 -->
        <div class="flex gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <a-input
            v-model:value="searchKeywords[library.id]"
            placeholder="搜索插件名称、作者或描述"
            class="flex-1"
            @input="handleSearch(library.id)"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
          
          <a-select
            v-model:value="sortOptions[library.id]"
            placeholder="排序方式"
            style="width: 150px"
            @change="handleSort(library.id)"
          >
            <a-select-option value="status">启用状态</a-select-option>
            <a-select-option value="name">名称</a-select-option>
            <a-select-option value="author">作者</a-select-option>
            <a-select-option value="createdAt">安装时间</a-select-option>
            <a-select-option value="category">分类</a-select-option>
          </a-select>
          
          <a-select
            v-model:value="categoryFilters[library.id]"
            placeholder="分类筛选"
            style="width: 120px"
            @change="handleFilter(library.id)"
            allowClear
          >
            <a-select-option value="">全部</a-select-option>
            <a-select-option
              v-for="category in getAvailableCategories(library.plugins)"
              :key="category"
              :value="category"
            >
              {{ getCategoryDisplayName(category) }}
            </a-select-option>
          </a-select>
        </div>

        <!-- 当前库插件统计 -->
        <div class="flex gap-4 mb-6">
          <a-statistic 
            title="插件数量" 
            :value="library.plugins.length" 
            class="library-stat"
          />
          <a-statistic 
            title="已启用" 
            :value="getActiveCount(library.plugins)" 
            :value-style="{ color: '#52c41a' }"
            class="library-stat" 
          />
          <a-statistic 
            title="已禁用" 
            :value="getInactiveCount(library.plugins)" 
            :value-style="{ color: '#ff4d4f' }"
            class="library-stat"
          />
        </div>

        <!-- 插件网格视图 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <a-card
            v-for="plugin in getFilteredPlugins(library)"
            :key="plugin.id"
            class="plugin-card transition-all duration-200"
            :class="{
              'border-green-200 bg-green-50': plugin.status === 'active',
              'border-gray-200 bg-gray-50': plugin.status === 'inactive'
            }"
          >
            <div class="plugin-header flex items-center justify-between mb-4">
              <div class="flex items-center">
                <div class="w-10 h-10 mr-3 flex items-center justify-center bg-gray-100 rounded-lg">
                  <img
                    v-if="plugin.icon"
                    :src="plugin.icon"
                    :alt="plugin.name"
                    class="w-8 h-8 object-contain"
                    @error="handleIconError"
                  />
                  <AppstoreOutlined v-else class="text-xl text-blue-500" />
                </div>
                <div>
                  <h3 class="font-semibold text-lg truncate">{{ plugin.name }}</h3>
                  <p class="text-sm text-gray-500">v{{ plugin.version }}</p>
                </div>
              </div>
              <a-switch
                :checked="plugin.status === 'active'"
                @change="(checked: boolean) => togglePlugin(plugin, checked)"
                :checkedChildren="'启用'"
                :unCheckedChildren="'禁用'"
                size="small"
              />
            </div>

            <p class="text-gray-600 text-sm mb-4 line-clamp-2">
              {{ plugin.description || '暂无描述' }}
            </p>

            <div class="plugin-info space-y-2 mb-4">
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">作者:</span>
                <span class="truncate ml-2">{{ plugin.author }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">分类:</span>
                <a-tag size="small" color="blue">{{ getCategoryDisplayName(plugin.category) }}</a-tag>
              </div>
            </div>

            <div class="plugin-actions flex gap-2">
              <a-button
                size="small"
                type="primary"
                @click="showPluginDetail(plugin)"
              >
                详情
              </a-button>
              
              <a-button
                v-if="plugin.configurable"
                size="small"
                @click="configurePlugin(plugin)"
              >
                配置
              </a-button>
              
              <a-dropdown>
                <a-button size="small">
                  更多<DownOutlined class="ml-1" />
                </a-button>
                <template #overlay>
                  <a-menu @click="({ key }: any) => handlePluginAction(key, plugin)">
                    <a-menu-item key="update">
                      <EditOutlined />
                      更新
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="uninstall" class="text-red-500">
                      卸载
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </a-card>
        </div>

        <!-- 分页 -->
        <div class="flex justify-center mt-8">
          <a-pagination
            v-model:current="currentPages[library.id]"
            v-model:page-size="pageSizes[library.id]"
            :total="getFilteredPlugins(library).length"
            :show-size-changer="true"
            :show-quick-jumper="true"
            :show-total="(total: number, range: [number, number]) => `第 ${range[0]}-${range[1]} 项，共 ${total} 项`"
            @change="handlePageChange(library.id, $event)"
          />
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 插件详情侧边面板 -->
    <a-drawer
      v-model:open="showDetailDrawer"
      title="插件详细信息"
      placement="right"
      :width="500"
      :closable="true"
    >
      <div v-if="selectedPlugin" class="plugin-detail">
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-100 rounded-lg">
            <img
              v-if="selectedPlugin.icon"
              :src="selectedPlugin.icon"
              :alt="selectedPlugin.name"
              class="w-12 h-12 object-contain"
              @error="handleIconError"
            />
            <AppstoreOutlined v-else class="text-3xl text-blue-500" />
          </div>
          <h2 class="text-xl font-bold">{{ selectedPlugin.name }}</h2>
          <p class="text-gray-500">v{{ selectedPlugin.version }}</p>
          <a-tag
            :color="selectedPlugin.status === 'active' ? 'green' : 'red'"
            class="mt-2"
          >
            {{ selectedPlugin.status === 'active' ? '已启用' : '已禁用' }}
          </a-tag>
        </div>

        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="描述">
            {{ selectedPlugin.description || '暂无描述' }}
          </a-descriptions-item>
          <a-descriptions-item label="作者">
            {{ selectedPlugin.author }}
          </a-descriptions-item>
          <a-descriptions-item label="分类">
            {{ getCategoryDisplayName(selectedPlugin.category) }}
          </a-descriptions-item>
          <a-descriptions-item label="所属库">
            {{ selectedPlugin.libraryName || selectedPlugin.libraryId || '未知' }}
          </a-descriptions-item>
          <a-descriptions-item label="依赖数量">
            {{ selectedPlugin.dependencies.length }} 个
          </a-descriptions-item>
          <a-descriptions-item label="入口文件">
            {{ selectedPlugin.main }}
          </a-descriptions-item>
          <a-descriptions-item label="安装时间">
            {{ formatDate(selectedPlugin.createdAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="更新时间">
            {{ formatDate(selectedPlugin.updatedAt) }}
          </a-descriptions-item>
        </a-descriptions>

        <div v-if="selectedPlugin.tags && selectedPlugin.tags.length > 0" class="mt-4">
          <h4 class="font-semibold mb-2">标签</h4>
          <div class="flex flex-wrap gap-2">
            <a-tag v-for="tag in selectedPlugin.tags" :key="tag" color="blue">
              {{ tag }}
            </a-tag>
          </div>
        </div>

        <div v-if="selectedPlugin.dependencies.length > 0" class="mt-4">
          <h4 class="font-semibold mb-2">依赖项</h4>
          <div class="space-y-1">
            <a-tag
              v-for="dep in selectedPlugin.dependencies"
              :key="dep"
              color="orange"
              class="block w-full"
            >
              {{ dep }}
            </a-tag>
          </div>
        </div>

        <div class="flex gap-2 mt-6">
          <a-button
            type="primary"
            :disabled="!selectedPlugin.configurable"
            @click="configurePlugin(selectedPlugin)"
          >
            配置插件
          </a-button>
          <a-button @click="togglePlugin(selectedPlugin, selectedPlugin.status !== 'active')">
            {{ selectedPlugin.status === 'active' ? '禁用' : '启用' }}
          </a-button>
        </div>
      </div>
    </a-drawer>

    <!-- 安装插件对话框 -->
    <a-modal v-model:open="showInstallDialog" title="安装插件" width="500px" @ok="handleInstallOk">
      <a-tabs v-model:activeKey="installTab">
        <a-tab-pane key="local" tab="从本地安装">
          <a-upload
            class="upload-demo"
            :file-list="fileList"
            :before-upload="handleBeforeUpload"
            @remove="handleRemove"
            accept=".zip,.tar.gz"
          >
            <a-button>
              <UploadOutlined />
              选择插件包
            </a-button>
            <div class="upload-tip">支持 .zip 和 .tar.gz 格式的插件包</div>
          </a-upload>
        </a-tab-pane>
        
        <a-tab-pane key="repository" tab="从仓库安装">
          <a-form :model="installForm" layout="vertical">
            <a-form-item label="插件名称" :rules="[{ required: true, message: '请输入插件名称' }]">
              <a-input
                v-model:value="installForm.name"
                placeholder="请输入npm包名称，如：mira-plugin-example"
              />
            </a-form-item>
            <a-form-item label="版本">
              <a-input
                v-model:value="installForm.version"
                placeholder="latest"
              />
            </a-form-item>
          </a-form>
        </a-tab-pane>
      </a-tabs>
    </a-modal>

    <!-- 插件配置对话框 -->
    <a-modal
      v-model:open="showConfigDialog"
      :title="`配置 ${configuringPlugin?.name}`"
      width="600px"
      @ok="savePluginConfig"
    >
      <div v-if="configuringPlugin" class="config-editor">
        <monaco-editor
          :model-value="pluginConfig"
          @update:model-value="pluginConfig = $event"
          language="json"
          :height="400"
          :options="editorOptions"
        />
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { 
  DownloadOutlined, 
  AppstoreOutlined, 
  DownOutlined, 
  UploadOutlined,
  SearchOutlined,
  EditOutlined
} from '@ant-design/icons-vue'
import { ref, onMounted, computed, reactive } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { Plugin } from '@/types'
import { api } from '@/utils/api'
import MonacoEditor from '@/components/MonacoEditor.vue'

// 定义接口
interface LibraryWithPlugins {
  id: string
  name: string
  description: string
  plugins: Plugin[]
}

// 响应式数据
const showInstallDialog = ref(false)
const showConfigDialog = ref(false)
const showDetailDrawer = ref(false)
const installTab = ref('local')
const configuringPlugin = ref<Plugin | null>(null)
const selectedPlugin = ref<Plugin | null>(null)
const pluginConfig = ref('')
const fileList = ref<any[]>([])
const librariesWithPlugins = ref<LibraryWithPlugins[]>([])
const activeLibraryTab = ref('')

// 每个素材库的搜索、排序、分页状态
const searchKeywords = reactive<{ [key: string]: string }>({})
const sortOptions = reactive<{ [key: string]: string }>({})
const categoryFilters = reactive<{ [key: string]: string }>({})
const currentPages = reactive<{ [key: string]: number }>({})
const pageSizes = reactive<{ [key: string]: number }>({})

const installForm = ref({
  name: '',
  version: 'latest'
})

const editorOptions = {
  theme: 'vs-dark',
  formatOnPaste: true,
  formatOnType: true,
  automaticLayout: true
}

// 计算属性
const totalPluginsCount = computed(() => {
  return librariesWithPlugins.value.reduce((total, library) => total + library.plugins.length, 0)
})

const activePluginsCount = computed(() => {
  return librariesWithPlugins.value.reduce((total, library) => 
    total + library.plugins.filter(p => p.status === 'active').length, 0)
})

const inactivePluginsCount = computed(() => {
  return librariesWithPlugins.value.reduce((total, library) => 
    total + library.plugins.filter(p => p.status === 'inactive').length, 0)
})

// 方法
const getCategoryDisplayName = (category?: string) => {
  const categoryMap: { [key: string]: string } = {
    'general': '通用',
    'security': '安全',
    'storage': '存储',
    'ui': '界面',
    'utility': '工具',
    'integration': '集成',
    'development': '开发'
  }
  return categoryMap[category || 'general'] || category || '通用'
}

const getAvailableCategories = (plugins: Plugin[]) => {
  const categories = new Set(plugins.map(p => p.category || 'general'))
  return Array.from(categories).sort()
}

const getActiveCount = (plugins: Plugin[]) => {
  return plugins.filter(p => p.status === 'active').length
}

const getInactiveCount = (plugins: Plugin[]) => {
  return plugins.filter(p => p.status === 'inactive').length
}

const getFilteredPlugins = (library: LibraryWithPlugins) => {
  let result = library.plugins

  // 搜索过滤
  const searchKeyword = searchKeywords[library.id] || ''
  if (searchKeyword) {
    const keyword = searchKeyword.toLowerCase()
    result = result.filter(plugin => 
      plugin.name.toLowerCase().includes(keyword) ||
      plugin.author.toLowerCase().includes(keyword) ||
      (plugin.description && plugin.description.toLowerCase().includes(keyword))
    )
  }

  // 分类过滤
  const categoryFilter = categoryFilters[library.id] || ''
  if (categoryFilter) {
    result = result.filter(plugin => plugin.category === categoryFilter)
  }

  // 排序
  const sortBy = sortOptions[library.id] || 'status'
  result.sort((a, b) => {
    switch (sortBy) {
      case 'status':
        // 已启用排在前面
        if (a.status !== b.status) {
          return a.status === 'active' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      case 'name':
        return a.name.localeCompare(b.name)
      case 'author':
        return a.author.localeCompare(b.author)
      case 'createdAt':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'category':
        return (a.category || '').localeCompare(b.category || '')
      default:
        return 0
    }
  })

  return result
}

const handleIconError = (event: Event) => {
  // 当图标加载失败时，隐藏图片元素
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

const handleSearch = (libraryId: string) => {
  currentPages[libraryId] = 1 // 搜索时重置页码
}

const handleSort = (libraryId: string) => {
  currentPages[libraryId] = 1 // 排序时重置页码
}

const handleFilter = (libraryId: string) => {
  currentPages[libraryId] = 1 // 过滤时重置页码
}

const handlePageChange = (libraryId: string, page: number) => {
  currentPages[libraryId] = page
}

const showPluginDetail = (plugin: Plugin) => {
  selectedPlugin.value = plugin
  showDetailDrawer.value = true
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const loadLibrariesWithPlugins = async () => {
  try {
    const response = await api.get('/api/plugins/by-library')
    librariesWithPlugins.value = response.data as LibraryWithPlugins[]
    
    // 初始化各库的状态
    librariesWithPlugins.value.forEach(library => {
      if (!searchKeywords[library.id]) searchKeywords[library.id] = ''
      if (!sortOptions[library.id]) sortOptions[library.id] = 'status'
      if (!categoryFilters[library.id]) categoryFilters[library.id] = ''
      if (!currentPages[library.id]) currentPages[library.id] = 1
      if (!pageSizes[library.id]) pageSizes[library.id] = 12
    })
    
    // 设置默认活动标签
    if (librariesWithPlugins.value.length > 0 && !activeLibraryTab.value) {
      activeLibraryTab.value = librariesWithPlugins.value[0].id
    }
  } catch (error) {
    message.error('加载插件列表失败')
    console.error('Failed to load plugins:', error)
    librariesWithPlugins.value = []
  }
}

const togglePlugin = async (plugin: Plugin, checked?: boolean) => {
  try {
    const newStatus = checked !== undefined ? (checked ? 'active' : 'inactive') : 
                     (plugin.status === 'active' ? 'inactive' : 'active')
    await api.patch(`/api/plugins/${plugin.id}/status`, { status: newStatus })
    plugin.status = newStatus
    
    // 如果在详情面板中，也要更新选中的插件状态
    if (selectedPlugin.value && selectedPlugin.value.id === plugin.id) {
      selectedPlugin.value.status = newStatus
    }
    
    message.success(`插件已${newStatus === 'active' ? '启用' : '禁用'}`)
  } catch (error) {
    message.error('操作失败')
  }
}

const configurePlugin = async (plugin: Plugin) => {
  try {
    const response = await api.get(`/api/plugins/${plugin.id}/config`)
    pluginConfig.value = JSON.stringify(response.data, null, 2)
    configuringPlugin.value = plugin
    showConfigDialog.value = true
    showDetailDrawer.value = false // 关闭详情面板
  } catch (error) {
    message.error('加载插件配置失败')
  }
}

const savePluginConfig = async () => {
  if (!configuringPlugin.value) return
  
  try {
    const config = JSON.parse(pluginConfig.value)
    await api.put(`/api/plugins/${configuringPlugin.value.id}/config`, config)
    message.success('配置保存成功')
    showConfigDialog.value = false
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      message.error('JSON 格式错误')
    } else {
      message.error('保存失败')
    }
  }
}

const handlePluginAction = async (command: string, plugin: Plugin) => {
  switch (command) {
    case 'update':
      try {
        await api.post(`/api/plugins/${plugin.id}/update`)
        message.success('插件更新成功')
        loadLibrariesWithPlugins()
      } catch (error) {
        message.error('更新失败')
      }
      break
      
    case 'uninstall':
      try {
        const confirmed = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: '确认卸载',
            content: `确定要卸载插件 "${plugin.name}" 吗？此操作不可撤销。`,
            okText: '确定',
            cancelText: '取消',
            onOk() {
              resolve(true)
            },
            onCancel() {
              resolve(false)
            }
          } as any)
        })
        
        if (!confirmed) return
        
        await api.delete(`/api/plugins/${plugin.id}`)
        message.success('插件卸载成功')
        
        // 如果卸载的是当前选中的插件，关闭详情面板
        if (selectedPlugin.value && selectedPlugin.value.id === plugin.id) {
          showDetailDrawer.value = false
          selectedPlugin.value = null
        }
        
        loadLibrariesWithPlugins()
      } catch (error: any) {
        message.error('卸载失败')
      }
      break
  }
}

const handleBeforeUpload = (file: any) => {
  fileList.value = [file]
  return false // 阻止自动上传
}

const handleRemove = () => {
  fileList.value = []
}

const handleInstallOk = async () => {
  if (installTab.value === 'repository') {
    await installFromRepository()
  } else {
    await uploadPlugin()
  }
}

const uploadPlugin = async () => {
  if (fileList.value.length === 0) {
    message.error('请选择插件包文件')
    return
  }

  try {
    const formData = new FormData()
    formData.append('file', fileList.value[0])
    
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    await api.post('/api/plugins/upload', formData, { headers })
    message.success('插件安装成功')
    showInstallDialog.value = false
    fileList.value = []
    loadLibrariesWithPlugins()
  } catch (error) {
    message.error('插件安装失败')
  }
}

const installFromRepository = async () => {
  if (!installForm.value.name) {
    message.error('请输入插件名称')
    return
  }

  try {
    await api.post('/api/plugins/install', installForm.value)
    message.success('插件安装成功')
    showInstallDialog.value = false
    installForm.value = { name: '', version: 'latest' }
    loadLibrariesWithPlugins()
  } catch (error: any) {
    if (error.response?.data?.error) {
      message.error(error.response.data.error)
    } else {
      message.error('安装失败')
    }
  }
}

onMounted(() => {
  loadLibrariesWithPlugins()
})
</script>

<style scoped>
/* 统计卡片样式 */
.stats-card {
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.stats-card.total-plugins {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-card.active-plugins {
  background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
}

.stats-card.inactive-plugins {
  background: linear-gradient(135deg, #ff6b6b 0%, #ffa8a8 100%);
}

.stats-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stats-icon {
  font-size: 24px;
  opacity: 0.9;
}

.stats-info h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  opacity: 0.9;
}

.stats-number {
  margin: 4px 0 0 0;
  font-size: 28px;
  font-weight: 700;
}

/* 标签页样式 */
.library-tabs {
  margin-top: 24px;
}

.library-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 24px;
}

.library-tabs :deep(.ant-tabs-tab) {
  padding: 12px 20px;
  font-weight: 500;
}

.library-tabs :deep(.ant-tabs-tab-active) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 插件卡片样式 */
.plugin-card {
  height: 320px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.plugin-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.plugin-card.border-green-200 {
  border-color: #b7eb8f;
  background: linear-gradient(145deg, #f6ffed 0%, #ffffff 100%);
}

.plugin-card.border-gray-200 {
  border-color: #d9d9d9;
  background: linear-gradient(145deg, #fafafa 0%, #ffffff 100%);
}

.plugin-card :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
}

.plugin-actions {
  margin-top: auto;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.config-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.upload-tip {
  margin-top: 8px;
  color: #666;
  font-size: 12px;
}

.plugin-header {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.plugin-info {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px;
}

.plugin-detail {
  padding: 16px 0;
}

.plugin-detail .ant-descriptions {
  margin-bottom: 20px;
}

.plugin-detail h4 {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

/* 库统计样式 */
.library-stat :deep(.ant-statistic-title) {
  color: #666;
  font-size: 12px;
}

.library-stat :deep(.ant-statistic-content) {
  font-size: 18px;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
  
  .plugin-manager {
    padding: 16px;
  }
  
  .flex.gap-4 {
    flex-direction: column;
    gap: 16px;
  }
  
  .flex.gap-4 > .a-input {
    width: 100%;
  }
}

@media (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 动画效果 */
.plugin-card {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 状态指示器 */
.plugin-card.border-green-200::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: #52c41a;
  border-radius: 0 4px 4px 0;
}

.plugin-card.border-gray-200::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: #d9d9d9;
  border-radius: 0 4px 4px 0;
}

/* Switch 自定义样式 */
.ant-switch-checked {
  background-color: #52c41a;
}

.ant-switch-checked .ant-switch-handle::before {
  background-color: #fff;
}

/* Tab样式覆盖 - 取消激活tab的紫色 */
.library-tabs :deep(.ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: #1890ff !important;
}

.library-tabs :deep(.ant-tabs-tab .ant-tabs-tab-btn) {
  color: #666 !important;
}

.library-tabs :deep(.ant-tabs-tab:hover .ant-tabs-tab-btn) {
  color: #1890ff !important;
}

.library-tabs :deep(.ant-tabs-ink-bar) {
  background: #1890ff !important;
}

.library-tabs :deep(.ant-tabs-tab.ant-tabs-tab-active) {
  background: none !important;
  border-color: #1890ff !important;
}
</style>
