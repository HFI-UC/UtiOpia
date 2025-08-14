<template>
  <div class="home">
    <!-- Hero Section -->
    <div class="hero">
      <div class="hero-content">
        <h2 class="hero-title">分享你的想法</h2>
        <p class="hero-subtitle">在这里写下你的小纸条，与大家分享你的心声</p>
        <router-link to="/write" class="hero-btn btn-primary">
          <span>📝</span>
          写纸条
        </router-link>
      </div>
    </div>

    <!-- Messages List -->
    <div class="messages-section">
      <div class="section-header">
        <h3 class="section-title">最新纸条</h3>
        <div class="message-count">共 {{ total }} 条纸条</div>
      </div>
      
      <div class="messages-grid">
        <div v-for="(m, index) in messages" :key="m.id" 
             class="message-card" 
             :class="{ 'featured': index < 3 }"
             :style="{ animationDelay: `${index * 0.1}s` }">
          <div class="card-header">
            <div class="message-meta">
              <span class="message-time">{{ formatTime(m.created_at) }}</span>
              <span class="message-status" :class="`status-${m.status}`">{{ getStatusText(m.status) }}</span>
            </div>
            <div class="message-actions" v-if="canEdit(m)">
              <button class="action-btn edit-btn" @click="onOpenEdit(m)" title="编辑">
                <span>✏️</span>
              </button>
              <button class="action-btn delete-btn" @click="onOpenDelete(m)" title="删除">
                <span>🗑️</span>
              </button>
            </div>
          </div>
          
          <div class="card-content">
            <p class="message-text">{{ m.content }}</p>
            <div v-if="m.image_url" class="message-image">
              <img :src="m.image_url" alt="图片" />
            </div>
          </div>

          <div class="card-footer">
            <div class="author-info">
              <span class="author-avatar">👤</span>
              <span class="author-name">
                {{ m.user_id ? '实名用户' : '匿名用户' }}
              </span>
            </div>
            <div class="message-id">#{{ m.id }}</div>
          </div>
        </div>
      </div>

      <!-- Loading & Status -->
      <div class="list-status">
        <div class="loading" v-if="isLoading">
          正在加载更多纸条...
        </div>
        <div class="done" v-else-if="isDone">
          <span>🎉</span>
          已加载全部纸条
        </div>
        <div class="empty" v-else-if="!messages.length && !isLoading">
          <span>📝</span>
          <p>还没有纸条，快来写第一条吧！</p>
          <router-link to="/write" class="btn-primary">写纸条</router-link>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
      <Dialog :open="showEdit" @close="showEdit=false" @confirm="doEdit">
      <template #title>✏️ 编辑纸条</template>
      <div class="dialog-content">
        <div class="form-group">
          <label>内容</label>
          <textarea v-model="formContent" rows="5" placeholder="写下你想说的话..."></textarea>
        </div>
          <template v-if="current && !current.user_id && current.is_anonymous">
          <div class="form-group">
            <label>身份口令</label>
            <input v-model="formPass" type="password" placeholder="用于验证匿名身份" />
          </div>
          </template>
        <div class="form-group">
          <label>安全验证</label>
          <Turnstile @verified="t => turnstileToken = t" />
        </div>
        </div>
      </Dialog>

      <Dialog :open="showDelete" @close="showDelete=false" @confirm="doDelete">
      <template #title>🗑️ 删除纸条</template>
      <div class="dialog-content">
        <div class="delete-warning">
          <span class="warning-icon">⚠️</span>
          <p>确定删除这条纸条吗？该操作不可恢复。</p>
        </div>
          <template v-if="current && !current.user_id && current.is_anonymous">
          <div class="form-group">
            <label>身份口令</label>
            <input v-model="formPass" type="password" placeholder="用于验证匿名身份" />
          </div>
          </template>
        <div class="form-group">
          <label>安全验证</label>
          <Turnstile @verified="t => turnstileToken = t" />
        </div>
        </div>
      </Dialog>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import Turnstile from '../components/Turnstile.vue'
import Dialog from '../components/Dialog.vue'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'
const auth = useAuthStore()
const authed = computed(() => !!auth.token)
const content = ref('')
const imageUrl = ref('')
const turnstileToken = ref('')
const loading = ref(false)
const error = ref('')
const messages = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const isLoading = ref(false)
const isDone = ref(false)
const isAnonymousMutable = ref(false)
const isAnonymous = computed(() => authed.value ? isAnonymousMutable.value : true)
const fileName = ref('')
const anonEmail = ref('')
const anonStudentId = ref('')
const anonPassphrase = ref('')

async function fetchMessages(reset=false) {
  if (isLoading.value) return
  isLoading.value = true
  try {
    if (reset) { page.value = 1; isDone.value = false; messages.value = [] }
    const res = await axios.get(`${API}/messages`, { params: { page: page.value, pageSize: pageSize.value }, headers: { Authorization: `Bearer ${auth.token}` } })
    const items = res.data.items || []
    total.value = res.data.total || 0
    messages.value = messages.value.concat(items)
    if (messages.value.length >= total.value) isDone.value = true
    page.value += 1
  } catch (e:any) {
    (window as any).$toast?.error(e.response?.data?.error || e.message)
  } finally {
    isLoading.value = false
  }
}

function pickFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  fileName.value = file.name
  uploadViaCOS(file)
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  fileName.value = file.name
  uploadViaCOS(file)
}

async function uploadViaCOS(file: File) {
  // 1. 获取预签名 URL
  const authHeaders: any = auth.token ? { Authorization: `Bearer ${auth.token}` } : {}
  if (file.size > 5 * 1024 * 1024) {
    (window as any).$toast?.error('文件过大，最大 5MB')
    return
  }
  const res = await axios.post(`${API}/upload/presign`, { filename: file.name, size: file.size }, { headers: authHeaders })
  if (res.data.error) throw new Error(res.data.error)
  const { upload_url, headers: uploadHeaders, public_url, get_url } = res.data
  // 2. 直传 COS
  await fetch(upload_url, { method: 'PUT', headers: uploadHeaders, body: file })
  imageUrl.value = get_url || public_url
}

async function submit() {
  try {
    loading.value = true
    const payload: any = { content: content.value, image_url: imageUrl.value, turnstile_token: turnstileToken.value, is_anonymous: isAnonymous.value }
    if (isAnonymous.value) {
      // 未登录（游客）才需要匿名身份字段
      if (!authed.value) {
      payload.anon_email = anonEmail.value
      payload.anon_student_id = anonStudentId.value
      payload.anon_passphrase = anonPassphrase.value
      }
    }
    const headers: any = auth.token ? { Authorization: `Bearer ${auth.token}` } : {}
    const res = await axios.post(`${API}/messages`, payload, { headers })
    if (res.data.error) throw new Error(res.data.error)
    content.value = ''
    imageUrl.value = ''
    await fetchMessages()
  } catch (e: any) {
    error.value = e.message || '发布失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMessages(true)
  window.addEventListener('scroll', onScroll)
})

function onScroll() {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200
  if (nearBottom && !isDone.value) fetchMessages()
}

function canEdit(m:any) {
  if (auth.user && m.user_id === auth.user.id) return true
  if (!m.user_id && m.is_anonymous) return true
  return false
}

const showEdit = ref(false)
const showDelete = ref(false)
const formContent = ref('')
const formPass = ref('')
let current: any = null

function onOpenEdit(m:any) { current = m; formContent.value = m.content; formPass.value = ''; showEdit.value = true }
function onOpenDelete(m:any) { current = m; formPass.value = ''; showDelete.value = true }

async function doEdit() {
  if (!current) return
  const body:any = { content: formContent.value, turnstile_token: turnstileToken.value }
  if (!current.user_id && current.is_anonymous) body.anon_passphrase = formPass.value
  await axios.put(`${API}/messages/${current.id}`, body, { headers: { Authorization: `Bearer ${auth.token}` } })
  showEdit.value = false
  await fetchMessages()
}
async function doDelete() {
  if (!current) return
  const body:any = { turnstile_token: turnstileToken.value }
  if (!current.user_id && current.is_anonymous) body.anon_passphrase = formPass.value
  await axios.delete(`${API}/messages/${current.id}`, { data: body, headers: { Authorization: `Bearer ${auth.token}` } as any })
  showDelete.value = false
  await fetchMessages(true)
}

// Utility functions for UI
function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusText(status: string) {
  const statusMap: Record<string, string> = {
    'pending': '待审核',
    'approved': '已通过', 
    'rejected': '已拒绝',
    'draft': '草稿'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
/* Hero Section */
.hero {
  background: var(--gradient-primary);
  color: white;
  padding: 80px 0;
  margin: -20px -20px 40px -20px;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.05"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  position: relative;
  z-index: 1;
  padding: 0 20px;
}

.hero-title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  margin: 0 0 16px 0;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.hero-subtitle {
  font-size: var(--font-size-lg);
  opacity: 0.9;
  margin: 0 0 32px 0;
  line-height: var(--line-height-relaxed);
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  background: white;
  color: var(--primary);
  border-radius: var(--radius);
  font-weight: 600;
  font-size: var(--font-size-lg);
  text-decoration: none;
  box-shadow: var(--shadow-lg);
  transition: all 0.3s ease;
}

.hero-btn:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
  color: var(--primary);
}

/* Messages Section */
.messages-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border-light);
}

.section-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text);
  margin: 0;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.message-count {
  background: var(--primary-100);
  color: var(--primary);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

/* Messages Grid */
.messages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.message-card {
  background: var(--card-bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  animation: fadeIn 0.6s ease-out;
  animation-fill-mode: both;
}

.message-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-200);
}

.message-card.featured {
  border: 2px solid var(--primary-200);
  background: var(--gradient-card);
}

.message-card.featured::before {
  content: '⭐';
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 18px;
}

/* Card Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.message-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-time {
  font-size: var(--font-size-xs);
  color: var(--muted);
  font-weight: 500;
}

.message-status {
  display: inline-block;
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-pending {
  background: var(--warning);
  color: white;
}

.status-approved {
  background: var(--success);
  color: white;
}

.status-rejected {
  background: var(--danger);
  color: white;
}

.status-draft {
  background: var(--muted);
  color: white;
}

.message-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-solid);
  border-radius: var(--radius-xs);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 14px;
}

.action-btn:hover {
  transform: scale(1.1);
}

.edit-btn:hover {
  background: var(--primary-100);
}

.delete-btn:hover {
  background: var(--danger);
  color: white;
}

/* Card Content */
.card-content {
  margin-bottom: 20px;
}

.message-text {
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  color: var(--text);
  margin: 0 0 16px 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message-image {
  margin-top: 16px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.message-image img {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  transition: transform 0.3s ease;
}

.message-image:hover img {
  transform: scale(1.02);
}

/* Card Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.author-name {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

.message-id {
  font-size: var(--font-size-xs);
  color: var(--muted);
  font-weight: 600;
  font-family: 'Monaco', 'Consolas', monospace;
}

/* List Status */
.list-status {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.loading, .done, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  color: var(--muted);
}

.loading {
  font-size: var(--font-size-base);
}

/* Loading spinner removed - using global CSS definition */

.done {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.empty {
  max-width: 400px;
  margin: 60px auto;
  padding: 40px;
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.empty span {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty p {
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
  margin: 0 0 24px 0;
}

/* Dialog Content */
.dialog-content {
  padding: 8px 0;
}

.delete-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--danger);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
}

.warning-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.delete-warning p {
  margin: 0;
  color: var(--danger);
  font-weight: 500;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .hero {
    padding: 60px 0;
    margin: -16px -16px 32px -16px;
  }
  
  .hero-title {
    font-size: var(--font-size-2xl);
  }
  
  .hero-subtitle {
    font-size: var(--font-size-base);
  }
  
  .hero-btn {
    padding: 12px 24px;
    font-size: var(--font-size-base);
  }
  
  .messages-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .message-card {
    padding: 20px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .section-title {
    font-size: var(--font-size-xl);
  }
}

@media (max-width: 480px) {
  .messages-section {
    padding: 0 16px;
  }
  
  .message-card {
    padding: 16px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .message-actions {
    align-self: flex-start;
  }
}
</style>

