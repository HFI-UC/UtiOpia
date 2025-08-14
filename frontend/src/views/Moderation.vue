<template>
  <div class="moderation-page">
    <!-- Hero Header -->
    <div class="page-hero">
      <div class="hero-content">
        <h1 class="page-title">🔍 内容审核</h1>
        <p class="page-subtitle">审核用户提交的纸条内容，维护社区环境</p>
      </div>
    </div>

    <div class="container">
      <div class="moderation-wrapper">
        <!-- Filter Section -->
        <div class="filter-section">
          <div class="filter-card">
            <h3 class="filter-title">📊 审核筛选</h3>
            <div class="filter-controls">
              <div class="form-group">
                <label>🏷️ 内容状态</label>
                <select v-model="status" @change="onFilter" class="status-select">
                  <option value="pending">⏳ 待审核</option>
                  <option value="rejected">❌ 已拒绝</option>
                  <option value="approved">✅ 已通过</option>
                  <option value="all">📋 全部状态</option>
                </select>
              </div>
              <div class="filter-actions">
                <button class="refresh-btn primary" @click="refresh">
                  <span>🔄</span>
                  刷新列表
                </button>
              </div>
            </div>
            <div class="filter-stats">
              <div class="stat-item">
                <span class="stat-label">当前筛选：</span>
                <span class="stat-value">{{ getStatusText(status) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">内容数量：</span>
                <span class="stat-value">{{ items.length }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Content List -->
        <div class="content-section">
          <div class="content-header">
            <h3 class="content-title">📝 待审核内容</h3>
          </div>

          <div class="content-list">
            <div v-for="m in items" :key="m.id" class="content-card" :class="`status-${m.status}`">
              <div class="card-header">
                <div class="card-meta">
                  <span class="content-id">#{{ m.id }}</span>
                  <span class="content-time">{{ formatTime(m.created_at) }}</span>
                  <span class="status-badge" :class="`status-${m.status}`">
                    {{ getStatusText(m.status) }}
                  </span>
                </div>
              </div>

              <div class="card-content">
                <div class="content-text">{{ m.content }}</div>
                <div v-if="m.image_url" class="content-image">
                  <img :src="m.image_url" alt="用户上传图片" />
                </div>
              </div>

              <div v-if="m.is_anonymous" class="author-info">
                <div class="info-item">
                  <span class="info-label">📧 匿名邮箱：</span>
                  <span class="info-value">{{ m.anon_email }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">🎓 学生号：</span>
                  <span class="info-value">{{ m.anon_student_id }}</span>
                </div>
              </div>

              <div class="card-actions">
                <button 
                  v-if="m.status === 'pending'"
                  @click="approve(m.id)" 
                  class="action-btn approve-btn"
                >
                  <span>✅</span>
                  通过审核
                </button>
                <button 
                  v-if="m.status === 'pending'"
                  @click="reject(m.id)" 
                  class="action-btn reject-btn"
                >
                  <span>❌</span>
                  拒绝内容
                </button>
                <div v-else class="action-status">
                  <span v-if="m.status === 'approved'" class="approved-text">
                    ✅ 已通过审核
                  </span>
                  <span v-else-if="m.status === 'rejected'" class="rejected-text">
                    ❌ 已拒绝
                  </span>
                </div>
              </div>
            </div>

            <div v-if="items.length === 0" class="empty-state">
              <div class="empty-icon">📝</div>
              <h4>暂无内容</h4>
              <p>当前筛选条件下没有找到任何内容</p>
              <button class="refresh-btn secondary" @click="refresh">
                <span>🔄</span>
                重新加载
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
 

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'
const auth = useAuthStore()
const items = ref<any[]>([])
 
const status = ref<'pending'|'rejected'|'approved'|'all'>('pending')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const isLoading = ref(false)

// 由组件设置 token

async function fetch(reset=false) {
  if (isLoading.value) return
  isLoading.value = true
  try {
    if (reset) { page.value = 1; items.value = [] }
    const res = await axios.get(`${API}/messages`, { params: { status: status.value, page: page.value, pageSize: pageSize.value }, headers: { Authorization: `Bearer ${auth.token}` } })
    const list = res.data.items || []
    total.value = res.data.total || 0
    items.value = items.value.concat(list)
    page.value += 1
  } finally { isLoading.value = false }
}
function onFilter(){ fetch(true) }
function refresh(){ fetch(true) }

async function approve(id: number) {
  await axios.post(`${API}/messages/${id}/approve`, {}, { headers: { Authorization: `Bearer ${auth.token}` } })
  await fetch(true)
}
async function reject(id: number) {
  const reason = prompt('拒绝理由：') || ''
  await axios.post(`${API}/messages/${id}/reject`, { reason }, { headers: { Authorization: `Bearer ${auth.token}` } })
  await fetch(true)
}

// Utility functions
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
    'all': '全部状态'
  }
  return statusMap[status] || status
}

fetch(true)
</script>

<style scoped>
/* Moderation Page Layout */
.moderation-page {
  min-height: 100vh;
  background: var(--bg-solid);
}

/* Hero Header */
.page-hero {
  background: var(--gradient-primary);
  color: white;
  padding: 60px 0;
  margin: -20px -20px 40px -20px;
  position: relative;
  overflow: hidden;
}

.page-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="moderation-pattern" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1.5" fill="white" opacity="0.1"/><circle cx="10" cy="30" r="1" fill="white" opacity="0.05"/></pattern></defs><rect width="100" height="100" fill="url(%23moderation-pattern)"/></svg>');
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  position: relative;
  z-index: 1;
  padding: 0 20px;
}

.page-title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  margin: 0 0 16px 0;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: var(--font-size-lg);
  opacity: 0.9;
  margin: 0;
  line-height: var(--line-height-relaxed);
}

/* Moderation Wrapper */
.moderation-wrapper {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Filter Section */
.filter-section {
  width: 100%;
}

.filter-card {
  background: var(--card-bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.filter-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text);
  margin: 0 0 20px 0;
}

.filter-controls {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 20px;
  align-items: end;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: var(--text);
  font-size: var(--font-size-sm);
}

.status-select {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  background: #fff;
  font-size: var(--font-size-base);
  transition: all 0.3s ease;
  cursor: pointer;
}

.status-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.status-select:hover {
  border-color: var(--primary-300);
}

.filter-actions {
  display: flex;
  gap: 12px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: var(--font-size-sm);
  transition: all 0.3s ease;
  white-space: nowrap;
}

.refresh-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.filter-stats {
  display: flex;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.stat-value {
  color: var(--primary);
  font-weight: 600;
  font-size: var(--font-size-base);
}

/* Content Section */
.content-section {
  width: 100%;
}

.content-header {
  margin-bottom: 24px;
}

.content-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

/* Content List */
.content-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-card {
  background: var(--card-bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
  position: relative;
}

.content-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.content-card.status-pending {
  border-left: 4px solid var(--warning);
}

.content-card.status-approved {
  border-left: 4px solid var(--success);
}

.content-card.status-rejected {
  border-left: 4px solid var(--danger);
}

/* Card Header */
.card-header {
  margin-bottom: 16px;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.content-id {
  font-family: 'Monaco', 'Consolas', monospace;
  font-weight: 600;
  color: var(--muted);
  font-size: var(--font-size-sm);
}

.content-time {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-xs);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.status-pending {
  background: var(--warning);
  color: white;
}

.status-badge.status-approved {
  background: var(--success);
  color: white;
}

.status-badge.status-rejected {
  background: var(--danger);
  color: white;
}

/* Card Content */
.card-content {
  margin-bottom: 20px;
}

.content-text {
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  color: var(--text);
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-bottom: 16px;
}

.content-image {
  margin-top: 16px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.content-image img {
  max-width: 100%;
  max-height: 300px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  transition: transform 0.3s ease;
}

.content-image:hover img {
  transform: scale(1.02);
}

/* Author Info */
.author-info {
  background: var(--bg-solid);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  min-width: 100px;
}

.info-value {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 600;
  font-family: 'Monaco', 'Consolas', monospace;
}

/* Card Actions */
.card-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.approve-btn {
  background: var(--success);
  color: white;
}

.approve-btn:hover {
  background: #059669;
}

.reject-btn {
  background: var(--danger);
  color: white;
}

.reject-btn:hover {
  background: #dc2626;
}

.action-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.approved-text {
  color: var(--success);
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.rejected-text {
  color: var(--danger);
  font-weight: 600;
  font-size: var(--font-size-sm);
}

/* Empty State */
.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary);
  background: var(--card-bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h4 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}

.empty-state p {
  margin: 0 0 20px 0;
  line-height: var(--line-height-relaxed);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .page-hero {
    padding: 40px 0;
    margin: -16px -16px 24px -16px;
  }
  
  .page-title {
    font-size: var(--font-size-2xl);
  }
  
  .page-subtitle {
    font-size: var(--font-size-base);
  }
  
  .filter-controls {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .filter-actions {
    justify-content: stretch;
  }
  
  .refresh-btn {
    flex: 1;
    justify-content: center;
  }
  
  .filter-stats {
    flex-direction: column;
    gap: 12px;
  }
  
  .content-card {
    padding: 20px;
  }
  
  .card-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .card-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .action-btn {
    flex: 1;
    justify-content: center;
  }
  
  .author-info {
    padding: 12px;
  }
  
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .info-label {
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 16px;
  }
  
  .filter-card,
  .content-card {
    margin: 0 -8px;
    border-radius: var(--radius-sm);
  }
  
  .filter-card {
    padding: 20px;
  }
  
  .content-card {
    padding: 16px;
  }
  
  .card-actions {
    gap: 6px;
  }
  
  .action-btn {
    padding: 8px 16px;
    font-size: var(--font-size-xs);
  }
}
</style>


