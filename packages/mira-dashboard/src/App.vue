<template>
  <div id="app" class="h-full">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// 应用启动时初始化认证状态
onMounted(async () => {
  try {
    if (authStore.token) {
      await authStore.initializeAuth()
    }
  } catch (error) {
    console.error('Failed to initialize auth:', error)
    // 如果认证失败，清除状态并跳转到登录页
    await authStore.logout()
    if (router.currentRoute.value.path !== '/login') {
      router.push('/login')
    }
  }
})
</script>

<style scoped>
#app {
  height: 100vh;
  width: 100vw;
}
</style>
