<template>
  <div class="plugin-manager">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">插件管理器</h1>
      <a-button type="primary" @click="showInstallDialog = true">
        <DownloadOutlined />
        安装插件
      </a-button>
    </div>

    <!-- 插件列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <a-card
        v-for="plugin in plugins"
        :key="plugin.id"
        class="plugin-card"
        shadow="hover"
      >
        <div class="plugin-header flex items-center justify-between mb-4">
          <div class="flex items-center">
            <AppstoreOutlined class="text-2xl text-blue-500 mr-3" />
            <div>
              <h3 class="font-semibold text-lg">{{ plugin.name }}</h3>
              <p class="text-sm text-gray-500">v{{ plugin.version }}</p>
            </div>
          </div>
          <a-tag :type="plugin.status === 'active' ? 'success' : 'danger'" size="small">
            {{ plugin.status === 'active' ? '已启用' : '已禁用' }}
          </a-tag>
        </div>

        <p class="text-gray-600 text-sm mb-4 line-clamp-2">
          {{ plugin.description || '暂无描述' }}
        </p>

        <div class="plugin-info space-y-2 mb-4">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">作者:</span>
            <span>{{ plugin.author }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">依赖:</span>
            <span>{{ plugin.dependencies.length }} 个</span>
          </div>
        </div>

        <div class="plugin-actions flex gap-2">
          <a-button
            size="small"
            :type="plugin.status === 'active' ? 'warning' : 'success'"
            @click="togglePlugin(plugin)"
          >
            {{ plugin.status === 'active' ? '禁用' : '启用' }}
          </a-button>
          
          <a-button
            v-if="plugin.configurable"
            size="small"
            type="primary"
            @click="configurePlugin(plugin)"
          >
            配置
          </a-button>
          
          <el-dropdown @command="(command: string) => handlePluginAction(command, plugin)">
            <a-button size="small" type="info">
              更多<DownOutlined class="ml-1" />
            </a-button>
            <template #overlay>
              <el-dropdown-menu>
                <el-dropdown-item command="update">更新</el-dropdown-item>
                <el-dropdown-item command="uninstall" divided>卸载</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </a-card>
    </div>

    <!-- 安装插件对话框 -->
    <a-modal :value="showInstallDialog" title="安装插件" width="500px">
      <el-tabs :value="installTab">
        <el-tab-pane label="从本地安装" name="local">
          <el-upload
            class="upload-demo"
            drag
            action="/api/plugins/upload"
            :headers="uploadHeaders"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            accept=".zip,.tar.gz"
          >
            <UploadOutlined />
            <div class="el-upload__text">
              将插件包拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 .zip 和 .tar.gz 格式的插件包
              </div>
            </template>
          </el-upload>
        </el-tab-pane>
        
        <el-tab-pane label="从仓库安装" name="repository">
          <a-form :model="installForm" label-width="80px">
            <a-form-item label="插件名称">
              <a-input
                :value="installForm.name"
                placeholder="请输入插件名称或Git仓库地址"
              />
            </a-form-item>
            <a-form-item label="版本">
              <a-input
                :value="installForm.version"
                placeholder="latest"
              />
            </a-form-item>
          </a-form>
          
          <div class="text-center mt-4">
            <a-button type="primary" @click="installFromRepository">
              安装
            </a-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </a-modal>

    <!-- 插件配置对话框 -->
    <a-modal
      :value="showConfigDialog"
      :title="`配置 ${configuringPlugin?.name}`"
      width="600px"
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
      
      <template #footer>
        <a-button @click="showConfigDialog = false">取消</a-button>
        <a-button type="primary" @click="savePluginConfig">保存配置</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { DownloadOutlined, AppstoreOutlined, DownOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { ref, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { Plugin } from '@/types'
import { api } from '@/utils/api'
import MonacoEditor from '@/components/MonacoEditor.vue'

const showInstallDialog = ref(false)
const showConfigDialog = ref(false)
const installTab = ref('local')
const configuringPlugin = ref<Plugin | null>(null)
const pluginConfig = ref('')

const plugins = ref<Plugin[]>([])

const installForm = ref({
  name: '',
  version: 'latest'
})

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

const editorOptions = {
  theme: 'vs-dark',
  formatOnPaste: true,
  formatOnType: true,
  automaticLayout: true
}

const loadPlugins = async () => {
  try {
    const response = await api.get('/api/plugins')
    plugins.value = response.data as any
  } catch (error) {
    message.error('加载插件列表失败')
    console.error('Failed to load plugins:', error)
    plugins.value = []
  }
}

const togglePlugin = async (plugin: Plugin) => {
  try {
    const newStatus = plugin.status === 'active' ? 'inactive' : 'active'
    await api.patch(`/plugins/${plugin.id}/status`, { status: newStatus })
    plugin.status = newStatus
    message.success(`插件已${newStatus === 'active' ? '启用' : '禁用'}`)
  } catch (error) {
    message.error('操作失败')
  }
}

const configurePlugin = async (plugin: Plugin) => {
  try {
    const response = await api.get(`/plugins/${plugin.id}/config`)
    pluginConfig.value = JSON.stringify(response.data, null, 2)
    configuringPlugin.value = plugin
    showConfigDialog.value = true
  } catch (error) {
    message.error('加载插件配置失败')
  }
}

const savePluginConfig = async () => {
  if (!configuringPlugin.value) return
  
  try {
    const config = JSON.parse(pluginConfig.value)
    await api.put(`/plugins/${configuringPlugin.value.id}/config`, config)
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
        await api.post(`/plugins/${plugin.id}/update`)
        message.success('插件更新成功')
        loadPlugins()
      } catch (error) {
        message.error('更新失败')
      }
      break
      
    case 'uninstall':
      try {
        await Modal.confirm({
          title: '确认卸载',
          content: `确定要卸载插件 "${plugin.name}" 吗？此操作不可撤销。`,
          okText: '确定',
          cancelText: '取消'
        })
        
        await api.delete(`/plugins/${plugin.id}`)
        message.success('插件卸载成功')
        loadPlugins()
      } catch (error: any) {
        if (error !== 'cancel') {
          message.error('卸载失败')
        }
      }
      break
  }
}

const handleUploadSuccess = () => {
  message.success('插件安装成功')
  showInstallDialog.value = false
  loadPlugins()
}

const handleUploadError = () => {
  message.error('插件安装失败')
}

const installFromRepository = async () => {
  try {
    await api.post('/plugins/install', installForm.value)
    message.success('插件安装成功')
    showInstallDialog.value = false
    installForm.value = { name: '', version: 'latest' }
    loadPlugins()
  } catch (error) {
    message.error('安装失败')
  }
}

onMounted(() => {
  loadPlugins()
})
</script>

<style scoped>
.plugin-manager {
  max-width: 1200px;
}

.plugin-card {
  height: 280px;
  display: flex;
  flex-direction: column;
}

.plugin-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.plugin-actions {
  margin-top: auto;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.config-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
</style>
