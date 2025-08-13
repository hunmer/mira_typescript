<template>
  <a-layout class="dashboard-layout">
    <!-- 侧边栏 -->
    <a-layout-sider width="250" class="sidebar">
      <div class="logo-container">
        <h2 class="text-white font-bold text-xl">Mira Dashboard</h2>
      </div>
      
      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="dark"
        mode="inline"
        class="sidebar-menu"
        @click="handleMenuClick"
      >
        <a-menu-item key="/overview">
          <template #icon>
            <HomeOutlined />
          </template>
          概览
        </a-menu-item>
        
        <a-menu-item key="/libraries">
          <template #icon>
            <FolderOutlined />
          </template>
          资源库管理器
        </a-menu-item>
        
        <a-menu-item key="/plugins">
          <template #icon>
            <AppstoreOutlined />
          </template>
          插件管理器
        </a-menu-item>
        
        <a-menu-item key="/admins">
          <template #icon>
            <UserOutlined />
          </template>
          管理员管理
        </a-menu-item>
        
        <a-menu-item key="/database">
          <template #icon>
            <DatabaseOutlined />
          </template>
          数据库预览
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <!-- 主内容区 -->
    <a-layout>
      <!-- 顶部导航栏 -->
      <a-layout-header class="header">
        <div class="flex justify-between items-center h-full">
          <h3 class="text-lg font-semibold text-gray-800">{{ pageTitle }}</h3>
          
          <div class="flex items-center space-x-4">
            <a-dropdown @command="handleCommand">
              <span class="dropdown-link">
                <UserOutlined class="text-gray-600" />
                <span class="ml-2">{{ user?.username }}</span>
                <DownOutlined class="ml-1" />
              </span>
              <template #overlay>
                <a-menu @click="handleMenuItemClick">
                  <a-menu-item key="logout">退出登录</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>
      </a-layout-header>

      <!-- 主要内容 -->
      <a-layout-content class="main-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { message } from 'ant-design-vue'
import { 
  HomeOutlined, 
  FolderOutlined, 
  AppstoreOutlined, 
  UserOutlined, 
  DatabaseOutlined,
  DownOutlined
} from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const selectedKeys = ref<string[]>([route.path])
const pageTitle = computed(() => route.meta?.title || '概览')
const user = computed(() => authStore.user)

// 监听路由变化，更新选中的菜单项
watch(() => route.path, (newPath) => {
  selectedKeys.value = [newPath]
})

const handleMenuClick = ({ key }: { key: string }) => {
  router.push(key)
}

const handleMenuItemClick = ({ key }: { key: string }) => {
  if (key === 'logout') {
    authStore.logout()
    message.success('退出登录成功')
    router.push('/login')
  }
}

// 保持向后兼容性
const handleCommand = (command: string) => {
  handleMenuItemClick({ key: command })
}
</script>

<style scoped>
.dashboard-layout {
  height: 100vh;
}

.sidebar {
  background-color: #2c3e50;
  color: white;
}

.logo-container {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #34495e;
}

.sidebar-menu {
  border: none;
  background: transparent;
}

.header {
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 20px;
}

.main-content {
  background-color: #f5f5f5;
  padding: 20px;
}

.dropdown-link {
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #606266;
}

/* Ant Design Vue 样式覆盖 */
:deep(.ant-layout-sider) {
  background-color: #2c3e50 !important;
}

:deep(.ant-menu-dark) {
  background-color: transparent;
}

:deep(.ant-layout-header) {
  background-color: white;
  height: 64px;
  line-height: 64px;
}

:deep(.ant-layout-content) {
  background-color: #f5f5f5;
}
</style>
