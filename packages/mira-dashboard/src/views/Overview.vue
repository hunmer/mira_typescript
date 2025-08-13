<template>
  <div class="overview-container">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">系统概览</h1>
    
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
import { MonitorOutlined, ClockCircleOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import StatCard from '@/components/StatCard.vue'

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

const loadStats = async () => {
  try {
    // 这里应该调用实际的API
    stats.value = {
      libraries: 12,
      plugins: 8,
      admins: 3,
      dbSize: '128 MB'
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const loadSystemInfo = async () => {
  try {
    // 这里应该调用实际的API
    systemInfo.value = {
      uptime: '5天 12小时',
      version: '1.0.0',
      nodeVersion: process.version || '18.0.0'
    }
  } catch (error) {
    console.error('加载系统信息失败:', error)
  }
}

onMounted(() => {
  loadStats()
  loadSystemInfo()
})
</script>

<style scoped>
.overview-container {
  max-width: 1200px;
}

.system-info,
.recent-activity {
  height: 300px;
}
</style>
