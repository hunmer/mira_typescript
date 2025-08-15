<template>
  <div class="device-manager">
    <div class="header">
      <h2>设备管理</h2>
      <div class="actions">
        <a-button @click="refreshData" :loading="loading" type="primary">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <a-card class="stat-card">
        <a-statistic
          title="素材库总数"
          :value="libraryCount"
          prefix="📚"
        />
      </a-card>
      <a-card class="stat-card">
        <a-statistic
          title="设备总连接数"
          :value="totalConnections"
          prefix="📱"
        />
      </a-card>
      <a-card class="stat-card">
        <a-statistic
          title="活跃连接数"
          :value="activeConnections"
          prefix="🟢"
          :value-style="{ color: '#52c41a' }"
        />
      </a-card>
      <a-card class="stat-card">
        <a-statistic
          title="连接率"
          :value="connectionRate"
          suffix="%"
          prefix="📊"
          :precision="1"
        />
      </a-card>
    </div>

    <!-- 错误提示 -->
    <a-alert
      v-if="error"
      :message="error"
      type="error"
      closable
      @close="clearError"
      style="margin-bottom: 16px"
    />

    <!-- 设备列表标签页 -->
    <a-card class="device-tabs-card">
      <a-tabs v-model:activeKey="activeTab" type="card" @change="onTabChange">
        <a-tab-pane
          v-for="(deviceList, libraryId) in devices"
          :key="libraryId"
          :tab="getTabTitle(libraryId, deviceList)"
        >
          <DeviceList
            :devices="deviceList"
            :library-id="libraryId"
            @disconnect="handleDisconnect"
            @send-message="handleSendMessage"
          />
        </a-tab-pane>
        
        <!-- 如果没有设备连接，显示空状态 -->
        <a-tab-pane v-if="Object.keys(devices).length === 0" key="empty" tab="暂无连接">
          <a-empty
            description="暂无设备连接"
            image="/static/empty.svg"
          >
            <template #footer>
              <a-button @click="refreshData" type="primary">刷新查看</a-button>
            </template>
          </a-empty>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 发送消息模态框 -->
    <a-modal
      v-model:open="messageModalVisible"
      title="发送消息到设备"
      @ok="confirmSendMessage"
      @cancel="cancelSendMessage"
      :confirm-loading="sendingMessage"
    >
      <a-form layout="vertical">
        <a-form-item label="目标设备">
          <a-input :value="selectedDevice?.clientId" disabled />
        </a-form-item>
        <a-form-item label="所属素材库">
          <a-input :value="selectedDevice?.libraryId" disabled />
        </a-form-item>
        <a-form-item label="消息内容" required>
          <a-textarea
            v-model:value="messageContent"
            placeholder="请输入要发送的消息内容"
            :rows="4"
            :maxlength="500"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { useDeviceStore, type DeviceInfo } from '@/stores/device'
import DeviceList from '@/components/DeviceList.vue'

const deviceStore = useDeviceStore()

// 响应式数据
const activeTab = ref<string>('')
const messageModalVisible = ref(false)
const messageContent = ref('')
const sendingMessage = ref(false)
const selectedDevice = ref<DeviceInfo | null>(null)

// 计算属性
const devices = computed(() => deviceStore.devices)
const loading = computed(() => deviceStore.loading)
const error = computed(() => deviceStore.error)
const totalConnections = computed(() => deviceStore.totalConnections)
const activeConnections = computed(() => deviceStore.activeConnections)
const libraryCount = computed(() => deviceStore.libraryCount)

const connectionRate = computed(() => {
  if (totalConnections.value === 0) return 0
  return (activeConnections.value / totalConnections.value) * 100
})

// 方法
const refreshData = async () => {
  await deviceStore.fetchLibraries()
  await deviceStore.fetchAllDevices()
  await deviceStore.fetchDeviceStats()
}

const clearError = () => {
  deviceStore.clearError()
}

const onTabChange = (key: string) => {
  activeTab.value = key
}

const getTabTitle = (libraryId: string, deviceList: DeviceInfo[]) => {
  const activeCount = deviceList.filter(device => device.status === 'connected').length
  const totalCount = deviceList.length
  const libraryName = deviceStore.getLibraryName(libraryId)
  return `${libraryName} (${activeCount}/${totalCount})`
}

const handleDisconnect = async (device: DeviceInfo) => {
  try {
    const result = await deviceStore.disconnectDevice(device.libraryId, device.clientId)
    if (result.success) {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
  } catch (error) {
    message.error('断开连接失败')
  }
}

const handleSendMessage = (device: DeviceInfo) => {
  selectedDevice.value = device
  messageContent.value = ''
  messageModalVisible.value = true
}

const confirmSendMessage = async () => {
  if (!selectedDevice.value || !messageContent.value.trim()) {
    message.warning('请填写消息内容')
    return
  }

  sendingMessage.value = true
  try {
    const result = await deviceStore.sendMessageToDevice(
      selectedDevice.value.libraryId,
      selectedDevice.value.clientId,
      messageContent.value.trim()
    )
    
    if (result.success) {
      message.success(result.message)
      messageModalVisible.value = false
      messageContent.value = ''
      selectedDevice.value = null
    } else {
      message.error(result.message)
    }
  } catch (error) {
    message.error('发送消息失败')
  } finally {
    sendingMessage.value = false
  }
}

const cancelSendMessage = () => {
  messageModalVisible.value = false
  messageContent.value = ''
  selectedDevice.value = null
}

// 监听设备数据变化，自动设置第一个标签页
watch(devices, (newDevices) => {
  const libraryIds = Object.keys(newDevices)
  if (libraryIds.length > 0 && !activeTab.value) {
    activeTab.value = libraryIds[0]
  }
}, { immediate: true })

// 组件挂载时获取数据
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.device-manager {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h2 {
  margin: 0;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
}

.device-tabs-card {
  min-height: 400px;
}

:deep(.ant-tabs-card > .ant-tabs-content) {
  margin-top: 16px;
}

:deep(.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab) {
  border-radius: 6px 6px 0 0;
}
</style>
