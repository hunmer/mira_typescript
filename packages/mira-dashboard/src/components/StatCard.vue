<template>
  <a-card class="stat-card" :class="`stat-card--${color}`">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-gray-600 mb-1">{{ title }}</p>
        <p class="text-2xl font-bold">{{ value }}</p>
      </div>
      <div class="stat-icon">
        <component :is="iconComponent" :style="{ fontSize: '24px' }" />
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  FolderOutlined, 
  AppstoreOutlined, 
  UserOutlined, 
  DatabaseOutlined 
} from '@ant-design/icons-vue'

interface Props {
  title: string
  value: string | number
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}

const props = defineProps<Props>()

const iconComponent = computed(() => {
  switch (props.icon) {
    case 'Folder':
      return FolderOutlined
    case 'Grid':
      return AppstoreOutlined
    case 'User':
      return UserOutlined
    case 'DataBase':
      return DatabaseOutlined
    default:
      return FolderOutlined
  }
})
</script>

<style scoped>
.stat-card {
  transition: transform 0.2s ease-in-out;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card--blue .stat-icon {
  color: #3b82f6;
  background-color: #eff6ff;
  border-radius: 12px;
  padding: 12px;
}

.stat-card--green .stat-icon {
  color: #10b981;
  background-color: #f0fdf4;
  border-radius: 12px;
  padding: 12px;
}

.stat-card--purple .stat-icon {
  color: #8b5cf6;
  background-color: #faf5ff;
  border-radius: 12px;
  padding: 12px;
}

.stat-card--orange .stat-icon {
  color: #f59e0b;
  background-color: #fffbeb;
  border-radius: 12px;
  padding: 12px;
}
</style>
