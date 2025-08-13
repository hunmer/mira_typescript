<template>
  <div class="overview-container">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">系统概览</h1>
      <a-button 
        type="primary" 
        :loading="loading" 
        @click="refreshData"
        class="flex items-center"
      >
        <template #icon>
          <ReloadOutlined />
        </template>
        刷新数据
      </a-button>
    </div>
    
    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="资源库总数"
        :value="stats.libraries"
        icon="Folder"
        color="blue"
      />
      <StatCard
        title="插件总数"
        :value="stats.plugins"
        icon="Grid"
        color="green"
      />
      <StatCard
        title="管理员数量"
        :value="stats.admins"
        icon="User"
        color="purple"
      />
      <StatCard
        title="数据库大小"
        :value="stats.dbSize"
        icon="DataBase"
        color="orange"
      />
    </div>

    <!-- 系统信息 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <a-card class="system-info">
        <template #title>
          <div class="flex items-center">
            <MonitorOutlined class="mr-2" />
            <span class="font-semibold">系统信息</span>
          </div>
        </template>
        
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-gray-600">服务器状态</span>
            <a-tag color="success">运行中</a-tag>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">运行时间</span>
            <span>{{ systemInfo.uptime }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">系统版本</span>
            <span>{{ systemInfo.version }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Node.js 版本</span>
            <span>{{ systemInfo.nodeVersion }}</span>
          </div>
        </div>
      </a-card>

      <a-card class="recent-activity">
        <template #title>
          <div class="flex items-center">
            <ClockCircleOutlined class="mr-2" />
            <span class="font-semibold">最近活动</span>
          </div>
        </template>
        
        <div class="space-y-3">
          <div
            v-for="activity in recentActivities"
            :key="activity.id"
            class="flex items-center p-3 bg-gray-50 rounded"
          >
            <InfoCircleOutlined class="mr-3 text-blue-500" />
            <div class="flex-1">
              <p class="text-sm">{{ activity.message }}</p>
              <p class="text-xs text-gray-500">{{ activity.time }}</p>
            </div>
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MonitorOutlined, ClockCircleOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import StatCard from '@/components/StatCard.vue'
import { api } from '@/utils/api'
import { message } from 'ant-design-vue'

const loading = ref(false)

const stats = ref({
  libraries: 0,
  plugins: 0,
  admins: 0,
  dbSize: '0 MB'
})

const systemInfo = ref({
  uptime: '0天 0小时',
  version: '1.0.0',
  nodeVersion: '18.0.0'
})

const recentActivities = ref([
  {
    id: 1,
    message: '系统启动完成',
    time: '刚刚'
  },
  {
    id: 2,
    message: '管理员登录',
    time: '5分钟前'
  },
  {
    id: 3,
    message: '新增资源库',
    time: '1小时前'
  }
])

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化运行时间
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}天 ${hours}小时`
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

const loadStats = async () => {
  try {
    // 并行请求所有需要的数据
    const [librariesRes, pluginsRes, adminsRes] = await Promise.all([
      api.get('/api/libraries'),
      api.get('/api/plugins'),
      api.get('/api/admins')
    ])

    const libraries = Array.isArray(librariesRes.data) ? librariesRes.data : []
    const plugins = Array.isArray(pluginsRes.data) ? pluginsRes.data : []
    const admins = Array.isArray(adminsRes.data) ? adminsRes.data : []

    // 计算总数据库大小（所有库的文件大小总和）
    const totalSize = libraries.reduce((sum: number, lib: any) => sum + (lib.size || 0), 0)

    stats.value = {
      libraries: libraries.length,
      plugins: plugins.length,
      admins: admins.length,
      dbSize: formatFileSize(totalSize)
    }

    // TODO: 获取最近活动
    recentActivities.value = []
  } catch (error) {
    console.error('加载统计数据失败:', error)
    message.error('加载统计数据失败，请稍后重试')
  }
}

const loadSystemInfo = async () => {
  try {
    // 获取系统健康信息
    const healthRes = await api.get('/health')
    const healthData = healthRes.data as any

    systemInfo.value = {
      uptime: formatUptime(healthData.uptime || 0),
      version: healthData.version || '1.0.0',
      nodeVersion: process.version || '18.0.0'
    }
  } catch (error) {
    console.error('加载系统信息失败:', error)
    // 如果健康检查失败，使用默认值
    systemInfo.value = {
      uptime: '未知',
      version: '1.0.0',
      nodeVersion: process.version || '18.0.0'
    }
  }
}

const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([loadStats(), loadSystemInfo()])
    message.success('数据刷新成功')
  } catch (error) {
    console.error('刷新数据失败:', error)
    message.error('刷新数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
  loadSystemInfo()
})
</script>

<style scoped>

.system-info,
.recent-activity {
  height: 300px;
}
</style>
