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
            <h3 class="filter-title">🔍 高级日志筛选</h3>
            
            <!-- Basic Filters -->
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
                <label>👤 用户ID</label>
                <input 
                  v-model="userId" 
                  placeholder="输入用户ID" 
                  class="filter-input"
                  type="number"
                />
              </div>
              <div class="form-group">
                <label>🌐 IP地址</label>
                <input 
                  v-model="ipAddress" 
                  placeholder="输入IP地址" 
                  class="filter-input"
                />
              </div>
            </div>

            <!-- Date Range Filters -->
            <div class="date-filters" v-show="showAdvanced">
              <div class="form-group">
                <label>📅 开始日期</label>
                <input 
                  v-model="startDate" 
                  type="datetime-local"
                  class="filter-input"
                />
              </div>
              <div class="form-group">
                <label>📅 结束日期</label>
                <input 
                  v-model="endDate" 
                  type="datetime-local"
                  class="filter-input"
                />
              </div>
              <div class="form-group">
                <label>🔗 请求路径</label>
                <input 
                  v-model="requestPath" 
                  placeholder="输入请求路径，如 /api/login" 
                  class="filter-input"
                />
              </div>
            </div>

            <!-- Advanced Options -->
            <div class="advanced-filters">
              <div class="checkbox-group">
                <input type="checkbox" id="onlyError" v-model="onlyError" />
                <label for="onlyError" class="checkbox-label">
                  <span class="checkbox-icon">🚨</span>
                  仅显示错误日志
                </label>
              </div>
              <div class="checkbox-group" v-show="showAdvanced">
                <input type="checkbox" id="hasTrace" v-model="hasTrace" />
                <label for="hasTrace" class="checkbox-label">
                  <span class="checkbox-icon">🐛</span>
                  包含错误堆栈
                </label>
              </div>
              <div class="checkbox-group" v-show="showAdvanced">
                <input type="checkbox" id="systemOnly" v-model="systemOnly" />
                <label for="systemOnly" class="checkbox-label">
                  <span class="checkbox-icon">⚙️</span>
                  仅系统操作
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
              <button class="toggle-advanced-btn ghost" @click="toggleAdvanced">
                <span>⚙️</span>
                {{ showAdvanced ? '收起高级' : '展开高级' }}
              </button>
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
              <div class="stat-item">
                <span class="stat-label">已展开条目：</span>
                <span class="stat-value">{{ expandedMeta.size }}</span>
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
                        <div class="meta-controls">
                          <button 
                            class="meta-toggle" 
                            @click="toggleMeta(log.id)"
                            :class="{ 'expanded': expandedMeta.has(log.id) }"
                          >
                            <span>{{ expandedMeta.has(log.id) ? '📄' : '📋' }}</span>
                            {{ expandedMeta.has(log.id) ? '收起详情' : '展开详情' }}
                          </button>
                          <div class="copy-actions" v-show="expandedMeta.has(log.id)">
                            <button 
                              class="copy-btn"
                              @click="copyToClipboard(pretty(log.meta), 'meta')"
                              title="复制详细信息"
                            >
                              📋 复制JSON
                            </button>
                            <button 
                              class="copy-btn"
                              @click="copyFullLog(log)"
                              title="复制完整日志"
                            >
                              📄 复制全部
                            </button>
                          </div>
                        </div>
                        
                        <div 
                          v-show="expandedMeta.has(log.id)" 
                          class="meta-expanded"
                        >
                          <div class="meta-header">
                            <span class="meta-title">📊 详细信息 (JSON格式)</span>
                            <span class="meta-size">{{ getJsonSize(log.meta) }}</span>
                          </div>
                          <pre class="meta-content">{{ formatJson(log.meta) }}</pre>
                        </div>
                        
                        <div 
                          v-show="!expandedMeta.has(log.id)" 
                          class="meta-preview"
                        >
                          <span class="preview-icon">💡</span>
                          {{ getMetaPreview(log.meta) }}
                        </div>
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
import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'
const auth = useAuthStore()
const items = ref<any[]>([])
const allItems = ref<any[]>([])

// Basic filters
const action = ref('')
const onlyError = ref(false)

// Advanced filters
const userId = ref('')
const ipAddress = ref('')
const startDate = ref('')
const endDate = ref('')
const requestPath = ref('')
const hasTrace = ref(false)
const systemOnly = ref(false)

// UI state
const expandedMeta = ref(new Set<number>())
const showAdvanced = ref(false)

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
  allItems.value = res.data.items || []
  applyAdvancedFilters()
}

function applyAdvancedFilters() {
  let filtered = [...allItems.value]

  // Apply client-side filters
  if (userId.value) {
    filtered = filtered.filter(log => 
      log.user_id && log.user_id.toString().includes(userId.value)
    )
  }

  if (systemOnly.value) {
    filtered = filtered.filter(log => !log.user_id)
  }

  if (ipAddress.value) {
    filtered = filtered.filter(log => {
      const meta = log.meta
      if (typeof meta === 'object' && meta) {
        return (
          (meta.ip && meta.ip.includes(ipAddress.value)) ||
          (meta.headers && meta.headers['Cf-Connecting-Ip'] && meta.headers['Cf-Connecting-Ip'].includes(ipAddress.value)) ||
          (meta.headers && meta.headers['X-Forwarded-For'] && meta.headers['X-Forwarded-For'].includes(ipAddress.value))
        )
      }
      return false
    })
  }

  if (requestPath.value) {
    filtered = filtered.filter(log => {
      const meta = log.meta
      if (typeof meta === 'object' && meta) {
        return meta.path && meta.path.includes(requestPath.value)
      }
      return false
    })
  }

  if (hasTrace.value) {
    filtered = filtered.filter(log => {
      const meta = log.meta
      if (typeof meta === 'object' && meta) {
        return meta.trace || meta.message
      }
      return false
    })
  }

  if (startDate.value) {
    const start = new Date(startDate.value)
    filtered = filtered.filter(log => new Date(log.created_at) >= start)
  }

  if (endDate.value) {
    const end = new Date(endDate.value)
    filtered = filtered.filter(log => new Date(log.created_at) <= end)
  }

  items.value = filtered
}

function clearFilters() {
  action.value = ''
  onlyError.value = false
  userId.value = ''
  ipAddress.value = ''
  startDate.value = ''
  endDate.value = ''
  requestPath.value = ''
  hasTrace.value = false
  systemOnly.value = false
  load()
}

function toggleAdvanced() {
  showAdvanced.value = !showAdvanced.value
}

// Watch filter changes and apply them automatically
function onFilterChange() {
  applyAdvancedFilters()
}

// JSON formatting and copy functions
function formatJson(data: any) {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

function getJsonSize(data: any) {
  try {
    const str = JSON.stringify(data)
    const bytes = new Blob([str]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${Math.round(bytes / (1024 * 1024))} MB`
  } catch {
    return '未知大小'
  }
}

async function copyToClipboard(text: string, type: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast(`${type === 'meta' ? '详细信息' : '内容'}已复制到剪贴板`, 'success')
  } catch (err) {
    console.error('复制失败:', err)
    showToast('复制失败，请手动选择文本', 'error')
  }
}

function copyFullLog(log: any) {
  const fullLog = {
    id: log.id,
    action: log.action,
    user_id: log.user_id,
    meta: log.meta,
    created_at: log.created_at,
    formatted_time: formatTime(log.created_at)
  }
  copyToClipboard(formatJson(fullLog), 'full')
}

function showToast(message: string, type: 'success' | 'error' = 'success') {
  // Create a simple toast notification
  const toast = document.createElement('div')
  toast.className = `toast-notification toast-${type}`
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `
  
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in'
    setTimeout(() => document.body.removeChild(toast), 300)
  }, 3000)
}

function getFilterStatus() {
  const filters = []
  if (action.value) filters.push(`操作类型: ${action.value}`)
  if (userId.value) filters.push(`用户ID: ${userId.value}`)
  if (ipAddress.value) filters.push(`IP: ${ipAddress.value}`)
  if (requestPath.value) filters.push(`路径: ${requestPath.value}`)
  if (startDate.value) filters.push(`开始: ${new Date(startDate.value).toLocaleDateString()}`)
  if (endDate.value) filters.push(`结束: ${new Date(endDate.value).toLocaleDateString()}`)
  if (onlyError.value) filters.push('仅错误')
  if (hasTrace.value) filters.push('包含堆栈')
  if (systemOnly.value) filters.push('仅系统')
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

// Watch for filter changes
watch([userId, ipAddress, startDate, endDate, requestPath, hasTrace, systemOnly], () => {
  onFilterChange()
}, { deep: true })

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
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: end;
  margin-bottom: 20px;
}

.date-filters {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: end;
  margin-bottom: 20px;
}

.advanced-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.advanced-filters .checkbox-group {
  flex: 0 0 auto;
  min-width: 200px;
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

.refresh-btn, .clear-btn, .toggle-advanced-btn {
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

.refresh-btn:hover, .clear-btn:hover, .toggle-advanced-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  background: var(--bg-solid);
  border-radius: var(--radius-xs);
  font-size: var(--font-size-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text);
}

.copy-btn:hover {
  background: var(--primary-100);
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
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
  max-width: 400px;
}

.meta-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.copy-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-expanded {
  background: var(--bg-solid);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.meta-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--primary-50);
  border-bottom: 1px solid var(--border-light);
}

.meta-title {
  font-weight: 600;
  font-size: var(--font-size-sm);
  color: var(--text);
}

.meta-size {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-family: 'Monaco', 'Consolas', monospace;
}

.meta-toggle {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border);
  background: var(--bg-solid);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text);
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
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  margin: 0;
  font-size: var(--font-size-xs);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Monaco', 'Consolas', monospace;
  line-height: 1.5;
  border: none;
  border-radius: 0;
}

.meta-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-family: 'Monaco', 'Consolas', monospace;
  line-height: 1.4;
  padding: 8px 12px;
  background: var(--primary-50);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
}

.preview-icon {
  font-size: 14px;
  flex-shrink: 0;
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
  
  .filter-controls,
  .date-filters {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .advanced-filters {
    flex-direction: column;
    gap: 12px;
  }
  
  .advanced-filters .checkbox-group {
    min-width: auto;
  }
  
  .filter-actions {
    justify-content: stretch;
    flex-wrap: wrap;
  }
  
  .refresh-btn, .clear-btn, .toggle-advanced-btn {
    flex: 1;
    justify-content: center;
    min-width: 120px;
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
    max-width: 250px;
  }
  
  .meta-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .copy-actions {
    flex-direction: column;
    gap: 6px;
  }
  
  .copy-btn {
    justify-content: center;
    font-size: var(--font-size-xs);
  }
  
  .meta-content {
    max-height: 150px;
    font-size: 11px;
  }
  
  .meta-header {
    padding: 8px 12px;
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
    max-width: 180px;
  }
  
  .meta-toggle {
    padding: 6px 12px;
    font-size: var(--font-size-xs);
  }
  
  .copy-actions {
    gap: 4px;
  }
  
  .copy-btn {
    padding: 4px 8px;
    font-size: 10px;
  }
  
  .meta-content {
    padding: 8px;
    max-height: 100px;
    font-size: 10px;
  }
  
  .meta-header {
    padding: 6px 8px;
  }
  
  .meta-title {
    font-size: var(--font-size-xs);
  }
}

/* Toast Animation */
@keyframes slideIn {
  from {
    transform: translateX(100%) scale(0.8);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
  to {
    transform: translateX(100%) scale(0.8);
    opacity: 0;
  }
}
</style>


