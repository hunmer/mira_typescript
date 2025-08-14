<template>
  <div class="admin-manager">
    <div class="flex justify-between items-center mb-6">
      <a-button type="primary" @click="showAddDialog = true">
        <PlusOutlined />
        添加管理员
      </a-button>
    </div>

    <!-- 管理员列表 -->
    <a-skeleton v-if="loading && admins.length === 0" active :paragraph="{ rows: 8 }" />
    
    <a-table
      v-else
      :loading="loading"
      :dataSource="admins"
      :columns="columns"
      class="admin-table"
      rowKey="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'username'">
          <div class="flex items-center">
            <a-avatar :size="32" class="mr-3">
              <template #icon><UserOutlined /></template>
            </a-avatar>
            <span class="font-medium">{{ record.username }}</span>
          </div>
        </template>
        
        <template v-else-if="column.key === 'role'">
          <a-tag color="blue">
            {{ record.role === 'admin' ? '管理员' : '用户' }}
          </a-tag>
        </template>
        
        <template v-else-if="column.key === 'createdAt'">
          {{ formatDate(record.createdAt) }}
        </template>
        
        <template v-else-if="column.key === 'updatedAt'">
          {{ formatDate(record.updatedAt) }}
        </template>
        
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button size="small" @click="editAdmin(record)">编辑</a-button>
            <a-button
              size="small"
              danger
              @click="deleteAdmin(record)"
              :disabled="record.id === currentUserId"
            >
              删除
            </a-button>
          </a-space>
        </template>
      </template>
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

// 表格列定义
const columns = [
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
    width: 200,
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
    width: 250,
  },
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
    width: 100,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
  },
  {
    title: '最后更新',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 180,
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right' as const,
  },
]

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
      const response = await api.post('/api/admins', adminData)
      
      // 只在API响应成功时显示消息（避免重复消息）
      if ((response.data as any)?.success) {
        message.success('管理员添加成功')
      }
    }
    
    closeDialog()
    await loadAdmins()
  } catch (error: any) {
    console.error('Save admin error:', error)
    
    // 处理特定的错误情况
    if (error.response?.data?.message) {
      message.error(error.response.data.message)
    } else if (error.response?.status === 400) {
      message.error('请求参数错误，请检查输入信息')
    } else if (error.response?.status === 500) {
      message.error('服务器内部错误，请稍后重试')
    } else {
      message.error('操作失败，请稍后重试')
    }
  }
}

const deleteAdmin = async (admin: User) => {
  try {
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除管理员 "${admin.username}" 吗？此操作不可撤销。`,
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          resolve(true)
        },
        onCancel: () => {
          resolve(false)
        }
      } as any)
    })
    
    if (!confirmed) {
      return // 用户取消操作
    }
    
    await api.delete(`/api/admins/${admin.id}`)
    message.success('管理员删除成功')
    await loadAdmins()
  } catch (error: any) {
    console.error('Delete admin error:', error)
    message.error('删除失败')
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

.plugin-skeleton, .stat-skeleton {
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
