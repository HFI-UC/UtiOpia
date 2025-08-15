<template>
  <div class="bans-page">
    <!-- Hero Header -->
    <div class="page-hero">
      <div class="hero-content">
        <h1 class="page-title">🚫 封禁管理</h1>
        <p class="page-subtitle">管理用户封禁记录，维护平台安全与秩序</p>
      </div>
    </div>

    <div class="container">
      <div class="bans-wrapper">
        <!-- Add Ban Section -->
        <div class="add-ban-section">
          <div class="ban-form-card">
            <h3 class="form-title">🛡️ 新增封禁</h3>
            <form class="ban-form" @submit.prevent="create">
              <div class="form-row">
                <div class="form-group">
                  <label>🏷️ 封禁类型</label>
                  <select v-model="type" class="type-select">
                    <option value="email">📧 邮箱封禁</option>
                    <option value="student_id">🎓 学号封禁</option>
      </select>
                </div>
                <div class="form-group">
                  <label>🎯 封禁目标</label>
                  <input 
                    v-model="value" 
                    :placeholder="type === 'email' ? 'xxx.yyy2023@gdhfi.com' : 'GJ20xxxxxx'"
                    class="value-input"
                  />
                </div>
                <div class="form-group">
                  <label>⏰ 封禁阶段</label>
                  <select v-model.number="stage" class="stage-select">
                    <option :value="1">阶段1 (7天)</option>
                    <option :value="2">阶段2 (14天)</option>
                    <option :value="3">阶段3 (30天)</option>
                    <option :value="4">阶段4 (60天)</option>
                    <option :value="5">阶段5 (90天)</option>
      </select>
                </div>
              </div>
              
              <div class="form-group">
                <label>📝 封禁原因 (可选)</label>
                <input 
                  v-model="reason" 
                  placeholder="请输入封禁原因，如：违规发言、恶意内容等"
                  class="reason-input"
                />
              </div>

              <div class="form-actions">
                <button type="submit" class="action-btn ban-btn">
                  <span>🚫</span>
                  新增封禁
                </button>
                <button type="button" @click="remove" class="action-btn unban-btn">
                  <span>✅</span>
                  解除封禁
                </button>
              </div>

              <div v-if="error" class="message error-message">
                <span class="message-icon">⚠️</span>
                {{ error }}
              </div>
              <div v-if="ok" class="message success-message">
                <span class="message-icon">✅</span>
                {{ ok }}
              </div>
            </form>
          </div>
        </div>

        <!-- Ban Records Section -->
        <div class="records-section">
          <div class="records-card">
            <div class="records-header">
              <h3 class="records-title">📋 封禁记录</h3>
              <div class="records-stats">
                <span class="stat-item">
                  <span class="stat-label">总记录数：</span>
                  <span class="stat-value">{{ items.length }}</span>
                </span>
                <span class="stat-item">
                  <span class="stat-label">生效中：</span>
                  <span class="stat-value">{{ activeCount }}</span>
                </span>
    </div>
  </div>

            <div class="table-wrapper">
              <table class="bans-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>类型</th>
                    <th>目标值</th>
                    <th>阶段</th>
                    <th>状态</th>
                    <th>到期时间</th>
                    <th>原因</th>
                    <th>创建时间</th>
                  </tr>
                </thead>
      <tbody>
                  <tr v-for="b in items" :key="b.id" class="ban-row" :class="getBanClass(b)">
                    <td class="ban-id">#{{ b.id }}</td>
                    <td class="ban-type">
                      <span class="type-badge" :class="`type-${b.type}`">
                        {{ getTypeText(b.type) }}
                      </span>
                    </td>
                    <td class="ban-value">{{ b.value }}</td>
                    <td class="ban-stage">
                      <span v-if="b.stage" class="stage-badge" :class="`stage-${b.stage}`">
                        阶段{{ b.stage }}
                      </span>
                      <span v-else class="no-stage">-</span>
                    </td>
                    <td class="ban-status">
                      <span class="status-badge" :class="b.active ? 'active' : 'inactive'">
                        {{ b.active ? '🔴 生效中' : '⚪ 已失效' }}
                      </span>
                    </td>
                    <td class="ban-expires">{{ formatExpires(b.expires_at) }}</td>
                    <td class="ban-reason">
                      <span v-if="b.reason" class="reason-text">{{ b.reason }}</span>
                      <span v-else class="no-reason">无原因</span>
                    </td>
                    <td class="ban-time">{{ formatTime(b.created_at) }}</td>
        </tr>
      </tbody>
    </table>

              <div v-if="items.length === 0" class="empty-state">
                <div class="empty-icon">🚫</div>
                <h4>暂无封禁记录</h4>
                <p>系统中还没有任何封禁记录</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'
const auth = useAuthStore()
const type = ref<'email'|'student_id'>('email')
const value = ref('')
const stage = ref(1)
const reason = ref('')
 
const error = ref('')
const ok = ref('')
const items = ref<any[]>([])

// 计算生效中的封禁数量
const activeCount = computed(() => items.value.filter(b => b.active).length)

async function create() {
  try {
    error.value = ''; ok.value = ''
    await axios.post(`${API}/bans`, { type: type.value, value: value.value, reason: reason.value, stage: stage.value }, { headers: { Authorization: `Bearer ${auth.token}` } })
    ok.value = '已封禁'
    await load() // 重新加载数据
  } catch (e:any) {
    error.value = e.response?.data?.error || e.message
  }
}

async function remove() {
  try {
    error.value = ''; ok.value = ''
    await axios.delete(`${API}/bans`, { data: { type: type.value, value: value.value }, headers: { Authorization: `Bearer ${auth.token}` } as any })
    ok.value = '已解除'
    await load() // 重新加载数据
  } catch (e:any) {
    error.value = e.response?.data?.error || e.message
  }
}

async function load() {
  const res = await axios.get(`${API}/bans`, { headers: { Authorization: `Bearer ${auth.token}` } })
  items.value = res.data.items || []
}

// 工具函数
function getTypeText(type: string) {
  return type === 'email' ? '📧 邮箱' : '🎓 学号'
}

function formatExpires(expires: string) {
  if (!expires) return '-'
  const date = new Date(expires)
  const now = new Date()
  if (date < now) return '已过期'
  return date.toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTime(time: string) {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getBanClass(ban: any) {
  return ban.active ? 'ban-active' : 'ban-inactive'
}

load()
</script>

<style scoped>
.bans-page {
  min-height: 100vh;
  animation: fadeIn 0.6s ease-out;
}

/* Hero Section */
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
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
  opacity: 0.5;
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  text-align: center;
  position: relative;
  z-index: 1;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-subtitle {
  font-size: 1.125rem;
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Main Content */
.bans-wrapper {
  display: grid;
  gap: 24px;
}

/* Add Ban Section */
.add-ban-section {
  animation: slideIn 0.6s ease-out 0.1s both;
}

.ban-form-card {
  background: var(--gradient-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  padding: 24px;
  transition: all 0.3s ease;
}

.ban-form-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-light);
}

.form-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ban-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-select,
.stage-select,
.value-input,
.reason-input {
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-family: inherit;
  background: var(--bg-solid);
  color: var(--text-primary);
  transition: all 0.2s ease;
  min-height: 44px;
}

.type-select:focus,
.stage-select:focus,
.value-input:focus,
.reason-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
  transform: translateY(-1px);
}

.type-select:hover,
.stage-select:hover,
.value-input:hover,
.reason-input:hover {
  border-color: var(--border-hover);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.action-btn {
  padding: 12px 20px;
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  font-weight: 500;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  text-decoration: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--border-hover);
}

.ban-btn {
  background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%);
  color: white;
  border-color: var(--danger);
}

.ban-btn:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  border-color: #dc2626;
  box-shadow: var(--shadow-md);
}

.unban-btn {
  background: linear-gradient(135deg, var(--success) 0%, #16a34a 100%);
  color: white;
  border-color: var(--success);
}

.unban-btn:hover {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  border-color: #16a34a;
  box-shadow: var(--shadow-md);
}

/* Messages */
.message {
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.error-message {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: var(--danger);
}

.success-message {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%);
  border: 1px solid rgba(34, 197, 94, 0.2);
  color: var(--success);
}

.message-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

/* Records Section */
.records-section {
  animation: slideIn 0.6s ease-out 0.2s both;
}

.records-card {
  background: var(--gradient-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  overflow: hidden;
  transition: all 0.3s ease;
}

.records-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-light);
}

.records-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light);
  background: var(--gradient-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.records-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.records-stats {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--primary-light);
  padding: 2px 8px;
  border-radius: var(--radius-xs);
}

/* Table */
.table-wrapper {
  overflow-x: auto;
}

.bans-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.bans-table th {
  background: var(--bg-secondary);
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border-light);
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.bans-table td {
  padding: 12px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary);
  vertical-align: middle;
}

.ban-row {
  transition: all 0.2s ease;
  border-left: 4px solid transparent;
}

.ban-row:hover {
  background: var(--bg-secondary);
  transform: translateX(2px);
}

.ban-row.ban-active {
  border-left-color: var(--danger);
}

.ban-row.ban-inactive {
  border-left-color: var(--text-tertiary);
  opacity: 0.7;
}

.ban-id {
  font-family: 'Monaco', 'Menlo', monospace;
  font-weight: 600;
  color: var(--text-secondary);
}

.ban-type .type-badge {
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  font-size: 0.75rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.type-badge.type-email {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%);
  color: var(--primary);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.type-badge.type-student_id {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
  color: #8b5cf6;
  border: 1px solid rgba(168, 85, 247, 0.2);
}

.ban-value {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8125rem;
}

.ban-stage .stage-badge {
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  font-size: 0.75rem;
  font-weight: 500;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%);
  color: var(--warning);
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.no-stage {
  color: var(--text-tertiary);
  font-style: italic;
}

.ban-status .status-badge {
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  font-size: 0.75rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-badge.active {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.status-badge.inactive {
  background: linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(107, 114, 128, 0.1) 100%);
  color: var(--text-tertiary);
  border: 1px solid rgba(156, 163, 175, 0.2);
}

.ban-expires {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8125rem;
}

.ban-reason .reason-text {
  color: var(--text-primary);
}

.no-reason {
  color: var(--text-tertiary);
  font-style: italic;
}

.ban-time {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .page-hero {
    padding: 40px 0;
    margin: -16px -16px 24px -16px;
  }

  .page-title {
    font-size: 2rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .ban-form-card,
  .records-card {
    padding: 20px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .action-btn {
    justify-content: center;
  }

  .records-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .records-stats {
    gap: 12px;
  }

  .bans-table {
    font-size: 0.8125rem;
  }

  .bans-table th,
  .bans-table td {
    padding: 8px;
  }

  .ban-row:hover {
    transform: none;
  }
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>


