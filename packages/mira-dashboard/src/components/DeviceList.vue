<template>
  <div class="device-list">
    <a-table
      :dataSource="devices"
      :columns="columns"
      :pagination="pagination"
      :scroll="{ x: 1200 }"
      :loading="loading"
      row-key="clientId"
    >
      <!-- 设备状态列 -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === 'connected' ? 'success' : 'error'">
            <template #icon>
              <span v-if="record.status === 'connected'">🟢</span>
              <span v-else>🔴</span>
            </template>
            {{ record.status === 'connected' ? '已连接' : '已断开' }}
          </a-tag>
        </template>
        
        <!-- 连接时间列 -->
        <template v-else-if="column.key === 'connectionTime'">
          <a-tooltip :title="formatDateTime(record.connectionTime)">
            {{ formatRelativeTime(record.connectionTime) }}
          </a-tooltip>
        </template>
        
        <!-- 最后活动时间列 -->
        <template v-else-if="column.key === 'lastActivity'">
          <a-tooltip :title="formatDateTime(record.lastActivity)">
            {{ formatRelativeTime(record.lastActivity) }}
          </a-tooltip>
        </template>
        
        <!-- 用户代理列 -->
        <template v-else-if="column.key === 'userAgent'">
          <a-tooltip :title="record.userAgent">
            <span class="user-agent">{{ getBrowserInfo(record.userAgent) }}</span>
          </a-tooltip>
        </template>
        
        <!-- IP地址列 -->
        <template v-else-if="column.key === 'ipAddress'">
          <a-tag>{{ record.ipAddress || 'Unknown' }}</a-tag>
        </template>
        
        <!-- 操作列 -->
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button
              type="link"
              size="small"
              @click="$emit('send-message', record)"
              :disabled="record.status !== 'connected'"
            >
              💬 发送消息
            </a-button>
            <a-button
              type="link"
              danger
              size="small"
              @click="confirmDisconnect(record)"
              :disabled="record.status !== 'connected'"
            >
              🔌 断开连接
            </a-button>
            <a-dropdown>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="details" @click="showDeviceDetails(record)">
                    👁️ 查看详情
                  </a-menu-item>
                  <a-menu-item key="refresh" @click="refreshDevice(record)">
                    <ReloadOutlined />
                    刷新状态
                  </a-menu-item>
                </a-menu>
              </template>
              <a-button type="link" size="small">
                更多
                <DownOutlined />
              </a-button>
            </a-dropdown>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 设备详情模态框 -->
    <a-modal
      v-model:open="detailsModalVisible"
      title="设备详细信息"
      :footer="null"
      width="600px"
    >
      <div v-if="selectedDevice" class="device-details">
        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="客户端ID">
            <a-typography-text copyable>{{ selectedDevice.clientId }}</a-typography-text>
          </a-descriptions-item>
          <a-descriptions-item label="素材库ID">
            <a-tag color="blue">{{ selectedDevice.libraryId }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="连接状态">
            <a-tag :color="selectedDevice.status === 'connected' ? 'success' : 'error'">
              {{ selectedDevice.status === 'connected' ? '已连接' : '已断开' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="IP地址">
            <a-typography-text copyable>{{ selectedDevice.ipAddress || 'Unknown' }}</a-typography-text>
          </a-descriptions-item>
          <a-descriptions-item label="用户代理">
            <a-typography-text copyable>{{ selectedDevice.userAgent || 'Unknown' }}</a-typography-text>
          </a-descriptions-item>
          <a-descriptions-item label="连接时间">
            {{ formatDateTime(selectedDevice.connectionTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="最后活动时间">
            {{ formatDateTime(selectedDevice.lastActivity) }}
          </a-descriptions-item>
          <a-descriptions-item label="连接URL">
            <a-typography-text copyable>{{ selectedDevice.requestInfo?.url || 'N/A' }}</a-typography-text>
          </a-descriptions-item>
        </a-descriptions>
        
        <a-divider>请求头信息</a-divider>
        <a-typography>
          <pre>{{ JSON.stringify(selectedDevice.requestInfo?.headers || {}, null, 2) }}</pre>
        </a-typography>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  ReloadOutlined,
  DownOutlined
} from '@ant-design/icons-vue'
import type { DeviceInfo } from '@/stores/device'

interface Props {
  devices: DeviceInfo[]
  libraryId: string
}

defineProps<Props>()

const emit = defineEmits<{
  disconnect: [device: DeviceInfo]
  'send-message': [device: DeviceInfo]
}>()

// 响应式数据
const loading = ref(false)
const detailsModalVisible = ref(false)
const selectedDevice = ref<DeviceInfo | null>(null)

// 表格列配置
const columns = [
  {
    title: '客户端ID',
    dataIndex: 'clientId',
    key: 'clientId',
    width: 120,
    ellipsis: true
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    filters: [
      { text: '已连接', value: 'connected' },
      { text: '已断开', value: 'disconnected' }
    ],
    onFilter: (value: string, record: DeviceInfo) => record.status === value
  },
  {
    title: 'IP地址',
    dataIndex: 'ipAddress',
    key: 'ipAddress',
    width: 140
  },
  {
    title: '浏览器/客户端',
    dataIndex: 'userAgent',
    key: 'userAgent',
    width: 150,
    ellipsis: true
  },
  {
    title: '连接时间',
    dataIndex: 'connectionTime',
    key: 'connectionTime',
    width: 120,
    sorter: (a: DeviceInfo, b: DeviceInfo) => 
      new Date(a.connectionTime).getTime() - new Date(b.connectionTime).getTime()
  },
  {
    title: '最后活动',
    dataIndex: 'lastActivity',
    key: 'lastActivity',
    width: 120,
    sorter: (a: DeviceInfo, b: DeviceInfo) => 
      new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right' as const
  }
]

// 分页配置
const pagination = computed(() => ({
  pageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 个设备`
}))

// 方法
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

const getBrowserInfo = (userAgent: string) => {
  if (!userAgent) return 'Unknown'
  
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  if (userAgent.includes('Opera')) return 'Opera'
  
  return 'Other'
}

const confirmDisconnect = (device: DeviceInfo) => {
  Modal.confirm({
    title: '确认断开连接',
    content: `确定要断开设备 ${device.clientId} 的连接吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: () => {
      emit('disconnect', device)
    }
  })
}

const showDeviceDetails = (device: DeviceInfo) => {
  selectedDevice.value = device
  detailsModalVisible.value = true
}

const refreshDevice = (device: DeviceInfo) => {
  message.info(`正在刷新设备 ${device.clientId} 的状态...`)
  // 这里可以添加刷新单个设备状态的逻辑
}
</script>

<style scoped>
.device-list {
  width: 100%;
}

.user-agent {
  display: inline-block;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-details pre {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  font-size: 12px;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 8px 16px;
}

:deep(.ant-table-thead > tr > th) {
  padding: 12px 16px;
}
</style>
