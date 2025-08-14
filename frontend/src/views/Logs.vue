<template>
  <div class="logs-page">
    <!-- Hero Header -->
    <div class="page-hero">
      <div class="hero-content">
        <h1 class="page-title">📊 系统日志</h1>
        <p class="page-subtitle">监控系统运行状态，追踪操作记录和错误信息</p>
      </div>
    </div>

    <div class="container">
      <div class="logs-wrapper">
        <!-- Filter Section -->
        <div class="filter-section">
          <div class="filter-card">
            <h3 class="filter-title">🔍 日志筛选</h3>
            <div class="filter-controls">
              <div class="form-group">
                <label>🏷️ 操作类型</label>
                <input 
                  v-model="action" 
                  placeholder="输入操作类型，如 error, login, create" 
                  class="filter-input"
                />
              </div>
              <div class="form-group">
                <div class="checkbox-group">
                  <input type="checkbox" id="onlyError" v-model="onlyError" />
                  <label for="onlyError" class="checkbox-label">
                    <span class="checkbox-icon">🚨</span>
                    仅显示错误日志
                  </label>
                </div>
              </div>
              <div class="filter-actions">
                <button class="refresh-btn primary" @click="load">
                  <span>🔄</span>
                  刷新日志
                </button>
                <button class="clear-btn secondary" @click="clearFilters">
                  <span>🗑️</span>
                  清空筛选
                </button>
              </div>
            </div>
            <div class="filter-stats">
              <div class="stat-item">
                <span class="stat-label">日志条数：</span>
                <span class="stat-value">{{ items.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">筛选状态：</span>
                <span class="stat-value">{{ getFilterStatus() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Logs Table Section -->
        <div class="table-section">
          <div class="table-card">
            <div class="table-header">
              <h3 class="table-title">📋 日志记录</h3>
              <div class="table-actions">
                <button class="export-btn ghost" @click="exportLogs">
                  <span>📥</span>
                  导出日志
                </button>
              </div>
            </div>

            <div class="table-wrapper">
              <table class="logs-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>操作类型</th>
                    <th>用户</th>
                    <th>详细信息</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in items" :key="log.id" class="log-row" :class="getLogClass(log)">
                    <td class="log-id">#{{ log.id }}</td>
                    <td class="log-action">
                      <span class="action-badge" :class="getActionClass(log.action)">
                        {{ log.action }}
                      </span>
                    </td>
                    <td class="log-user">
                      <span v-if="log.user_id" class="user-id">用户 #{{ log.user_id }}</span>
                      <span v-else class="system-action">系统</span>
                    </td>
                    <td class="log-meta">
                      <div class="meta-wrapper">
                        <button 
                          class="meta-toggle" 
                          @click="toggleMeta(log.id)"
                          :class="{ 'expanded': expandedMeta.has(log.id) }"
                        >
                          {{ expandedMeta.has(log.id) ? '收起' : '展开' }}
                        </button>
                        <pre 
                          v-show="expandedMeta.has(log.id)" 
                          class="meta-content"
                        >{{ pretty(log.meta) }}</pre>
                        <div 
                          v-show="!expandedMeta.has(log.id)" 
                          class="meta-preview"
                        >{{ getMetaPreview(log.meta) }}</div>
                      </div>
                    </td>
                    <td class="log-time">{{ formatTime(log.created_at) }}</td>
                  </tr>
                </tbody>
              </table>

              <div v-if="items.length === 0" class="empty-state">
                <div class="empty-icon">📊</div>
                <h4>暂无日志记录</h4>
                <p>当前筛选条件下没有找到任何日志记录</p>
                <button class="refresh-btn secondary" @click="load">
                  <span>🔄</span>
                  重新加载
                </button>
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
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'
const auth = useAuthStore()
const items = ref<any[]>([])
const action = ref('')
const onlyError = ref(false)
const expandedMeta = ref(new Set<number>())

function pretty(v:any) { 
  try { 
    return JSON.stringify(v, null, 2) 
  } catch { 
    return String(v) 
  } 
}

async function load() {
  const res = await axios.get(`${API}/logs`, { 
    params: { 
      action: action.value, 
      only_error: onlyError.value ? 1 : 0 
    }, 
    headers: { Authorization: `Bearer ${auth.token}` } 
  })
  items.value = res.data.items || []
}

function clearFilters() {
  action.value = ''
  onlyError.value = false
  load()
}

function getFilterStatus() {
  const filters = []
  if (action.value) filters.push(`操作类型: ${action.value}`)
  if (onlyError.value) filters.push('仅错误')
  return filters.length > 0 ? filters.join(' + ') : '无筛选'
}

function toggleMeta(id: number) {
  if (expandedMeta.value.has(id)) {
    expandedMeta.value.delete(id)
  } else {
    expandedMeta.value.add(id)
  }
}

function getMetaPreview(meta: any) {
  const str = pretty(meta)
  return str.length > 50 ? str.substring(0, 50) + '...' : str
}

function getLogClass(log: any) {
  if (log.action.includes('error') || log.action.includes('fail')) {
    return 'log-error'
  }
  if (log.action.includes('warn')) {
    return 'log-warning'
  }
  if (log.action.includes('success') || log.action.includes('create') || log.action.includes('login')) {
    return 'log-success'
  }
  return 'log-info'
}

function getActionClass(action: string) {
  if (action.includes('error') || action.includes('fail')) {
    return 'action-error'
  }
  if (action.includes('warn')) {
    return 'action-warning'
  }
  if (action.includes('success') || action.includes('create') || action.includes('login')) {
    return 'action-success'
  }
  return 'action-info'
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function exportLogs() {
  const data = items.value.map(log => ({
    ID: log.id,
    操作类型: log.action,
    用户: log.user_id || '系统',
    详细信息: pretty(log.meta),
    时间: formatTime(log.created_at)
  }))
  
  const csvContent = "data:text/csv;charset=utf-8," 
    + Object.keys(data[0]).join(',') + '\n'
    + data.map(row => Object.values(row).map(val => `"${val}"`).join(',')).join('\n')
  
  const link = document.createElement('a')
  link.setAttribute('href', encodeURI(csvContent))
  link.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

load()
</script>

<style scoped>
/* Logs Page Layout */
.logs-page {
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
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="logs-pattern" width="50" height="50" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="2" fill="white" opacity="0.1"/><circle cx="10" cy="10" r="1" fill="white" opacity="0.05"/><circle cx="40" cy="40" r="1.5" fill="white" opacity="0.08"/></pattern></defs><rect width="100" height="100" fill="url(%23logs-pattern)"/></svg>');
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

/* Logs Wrapper */
.logs-wrapper {
  max-width: 1400px;
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
  grid-template-columns: 2fr 1fr auto;
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

.filter-input {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  background: #fff;
  font-size: var(--font-size-base);
  transition: all 0.3s ease;
}

.filter-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.filter-input:hover {
  border-color: var(--primary-300);
}

/* Checkbox Group */
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--primary-50);
  border: 1px solid var(--primary-200);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--primary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0;
}

.checkbox-icon {
  font-size: 16px;
}

.filter-actions {
  display: flex;
  gap: 12px;
}

.refresh-btn, .clear-btn {
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

.refresh-btn:hover, .clear-btn:hover {
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

/* Table Section */
.table-section {
  width: 100%;
}

.table-card {
  background: var(--card-bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.table-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-light);
  background: var(--gradient-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 12px;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  font-size: var(--font-size-sm);
  transition: all 0.3s ease;
}

.export-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

/* Table Wrapper */
.table-wrapper {
  overflow-x: auto;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.logs-table th {
  background: var(--bg-solid);
  color: var(--text);
  font-weight: 600;
  padding: 16px 12px;
  text-align: left;
  border-bottom: 2px solid var(--border-light);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: sticky;
  top: 0;
  z-index: 10;
}

.logs-table td {
  padding: 16px 12px;
  border-bottom: 1px solid var(--border-light);
  vertical-align: top;
}

.log-row {
  transition: background-color 0.2s ease;
}

.log-row:hover {
  background: var(--primary-50);
}

.log-row.log-error {
  background: rgba(239, 68, 68, 0.05);
  border-left: 4px solid var(--danger);
}

.log-row.log-warning {
  background: rgba(245, 158, 11, 0.05);
  border-left: 4px solid var(--warning);
}

.log-row.log-success {
  background: rgba(16, 185, 129, 0.05);
  border-left: 4px solid var(--success);
}

.log-row.log-info {
  background: rgba(99, 102, 241, 0.05);
  border-left: 4px solid var(--primary);
}

.log-id {
  font-family: 'Monaco', 'Consolas', monospace;
  font-weight: 600;
  color: var(--muted);
  min-width: 80px;
}

/* Action Badge */
.action-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-xs);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: 'Monaco', 'Consolas', monospace;
}

.action-badge.action-error {
  background: var(--danger);
  color: white;
}

.action-badge.action-warning {
  background: var(--warning);
  color: white;
}

.action-badge.action-success {
  background: var(--success);
  color: white;
}

.action-badge.action-info {
  background: var(--primary);
  color: white;
}

.log-user {
  min-width: 100px;
}

.user-id {
  color: var(--text);
  font-weight: 500;
}

.system-action {
  color: var(--muted);
  font-style: italic;
}

/* Meta Section */
.log-meta {
  max-width: 300px;
}

.meta-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-toggle {
  align-self: flex-start;
  padding: 4px 12px;
  border: 1px solid var(--border);
  background: var(--bg-solid);
  border-radius: var(--radius-xs);
  font-size: var(--font-size-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.meta-toggle:hover {
  background: var(--primary-100);
  border-color: var(--primary);
}

.meta-toggle.expanded {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.meta-content {
  background: var(--bg-solid);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  padding: 12px;
  margin: 0;
  font-size: var(--font-size-xs);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Monaco', 'Consolas', monospace;
}

.meta-preview {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-family: 'Monaco', 'Consolas', monospace;
  line-height: 1.4;
}

.log-time {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  min-width: 150px;
  white-space: nowrap;
}

/* Empty State */
.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary);
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
  
  .refresh-btn, .clear-btn {
    flex: 1;
    justify-content: center;
  }
  
  .filter-stats {
    flex-direction: column;
    gap: 12px;
  }
  
  .table-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .logs-table {
    font-size: var(--font-size-xs);
  }
  
  .logs-table th,
  .logs-table td {
    padding: 12px 8px;
  }
  
  .log-meta {
    max-width: 200px;
  }
  
  .meta-content {
    max-height: 150px;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 16px;
  }
  
  .filter-card,
  .table-card {
    margin: 0 -8px;
    border-radius: var(--radius-sm);
  }
  
  .filter-card {
    padding: 20px;
  }
  
  .table-header {
    padding: 20px;
  }
  
  .logs-table th,
  .logs-table td {
    padding: 10px 6px;
  }
  
  .log-meta {
    max-width: 150px;
  }
  
  .meta-content {
    padding: 8px;
    max-height: 100px;
  }
}
</style>


