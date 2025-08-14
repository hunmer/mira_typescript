<template>
  <div class="admin-manager">
    <div class="flex justify-between items-center mb-6">
      <a-button type="primary" @click="showAddDialog = true">
        <PlusOutlined />
        添加管理员
      </a-button>
    </div>

    <!-- 管理员列表 -->
    <a-table
      :loading="loading"
      :data="admins"
      class="admin-table"
    >
      <a-table-column name="username" label="用户名" min-width="150">
        <template #default="{ row }">
          <div class="flex items-center">
            <el-avatar :size="32" class="mr-3">
              <UserOutlined />
            </el-avatar>
            <span class="font-medium">{{ row.username }}</span>
          </div>
        </template>
      </a-table-column>
      
      <a-table-column name="email" label="邮箱" min-width="200" />
      
      <a-table-column name="role" label="角色" width="100">
        <template #default="{ row }">
          <a-tag type="primary" size="small">
            {{ row.role === 'admin' ? '管理员' : '用户' }}
          </a-tag>
        </template>
      </a-table-column>
      
      <a-table-column name="createdAt" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </a-table-column>
      
      <a-table-column name="updatedAt" label="最后更新" width="180">
        <template #default="{ row }">
          {{ formatDate(row.updatedAt) }}
        </template>
      </a-table-column>
      
      <a-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <a-button size="small" @click="editAdmin(row)">编辑</a-button>
          <a-button
            size="small"
            danger
            @click="deleteAdmin(row)"
            :disabled="row.id === currentUserId"
          >
            删除
          </a-button>
        </template>
      </a-table-column>
    </a-table>

    <!-- 添加/编辑管理员对话框 -->
    <a-modal
      v-model:open="showAddDialog"
      :title="editingAdmin ? '编辑管理员' : '添加管理员'"
      width="500px"
      @cancel="closeDialog"
    >
      <a-form
        ref="adminFormRef"
        :model="adminForm"
        :rules="adminRules"
        label-width="80px"
      >
        <a-form-item label="用户名" name="username">
          <a-input
            v-model:value="adminForm.username"
            placeholder="请输入用户名"
            :disabled="!!editingAdmin"
          />
        </a-form-item>
        
        <a-form-item label="邮箱" name="email">
          <a-input
            v-model:value="adminForm.email"
            placeholder="请输入邮箱地址"
            type="email"
          />
        </a-form-item>
        
        <a-form-item
          v-if="!editingAdmin"
          label="密码"
          name="password"
        >
          <a-input
            v-model:value="adminForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </a-form-item>
        
        <a-form-item
          v-if="!editingAdmin"
          label="确认密码"
          name="confirmPassword"
        >
          <a-input
            v-model:value="adminForm.confirmPassword"
            type="password"
            placeholder="请确认密码"
            show-password
          />
        </a-form-item>
      </a-form>
      
      <template #footer>
        <a-button @click="closeDialog">取消</a-button>
        <a-button type="primary" @click="saveAdmin">确定</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { PlusOutlined, UserOutlined } from '@ant-design/icons-vue'
import { ref, computed, onMounted } from 'vue'
import { message, Modal, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import type { User, CreateAdminForm } from '@/types/auth'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/utils/api'

const authStore = useAuthStore()
const loading = ref(false)
const showAddDialog = ref(false)
const editingAdmin = ref<User | null>(null)
const adminFormRef = ref<FormInstance>()

const admins = ref<User[]>([])

const adminForm = ref<CreateAdminForm>({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const currentUserId = computed(() => authStore.user?.id)

const validatePasswordConfirm = (_rule: any, value: string, callback: any) => {
  if (value !== adminForm.value.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const adminRules: Record<string, Rule[]> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validatePasswordConfirm, trigger: 'blur' }
  ]
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const closeDialog = () => {
  showAddDialog.value = false
  editingAdmin.value = null
  adminForm.value = { username: '', email: '', password: '', confirmPassword: '' }
  if (adminFormRef.value) {
    adminFormRef.value.resetFields()
  }
}

const loadAdmins = async () => {
  loading.value = true
  try {
    const response = await api.get('/api/admins')
    admins.value = response.data as any
  } catch (error) {
    message.error('加载管理员列表失败')
    console.error('Failed to load admins:', error)
    admins.value = []
  } finally {
    loading.value = false
  }
}

const editAdmin = (admin: User) => {
  editingAdmin.value = admin
  adminForm.value = {
    username: admin.username,
    email: admin.email,
    password: '',
    confirmPassword: ''
  }
  showAddDialog.value = true
}

const saveAdmin = async () => {
  if (!adminFormRef.value) return
  
  try {
    await adminFormRef.value.validate()
    
    if (editingAdmin.value) {
      // 更新管理员（只更新邮箱）
      await api.put(`/api/admins/${editingAdmin.value.id}`, {
        email: adminForm.value.email
      })
      message.success('管理员信息更新成功')
    } else {
      // 添加管理员
      const { confirmPassword, ...adminData } = adminForm.value
      await api.post('/api/admins', adminData)
      message.success('管理员添加成功')
    }
    
    closeDialog()
    loadAdmins()
  } catch (error: any) {
    message.error(error.response?.data?.message || '操作失败')
  }
}

const deleteAdmin = async (admin: User) => {
  try {
    await Modal.confirm({
      title: '确认删除',
      content: `确定要删除管理员 "${admin.username}" 吗？此操作不可撤销。`,
      okText: '确定',
      cancelText: '取消'
    })
    
    await api.delete(`/api/admins/${admin.id}`)
    message.success('管理员删除成功')
    loadAdmins()
  } catch (error: any) {
    if (error !== 'cancel') {
      message.error('删除失败')
    }
  }
}

onMounted(() => {
  loadAdmins()
})
</script>

<style scoped>

.admin-table {
  background: white;
  border-radius: 8px;
}
</style>
