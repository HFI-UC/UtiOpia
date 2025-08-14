<template>
  <div class="admin-page">
    <!-- Hero Header -->
    <div class="page-hero">
      <div class="hero-content">
        <h1 class="page-title">👥 用户管理</h1>
        <p class="page-subtitle">管理系统用户、角色权限和账户状态</p>
      </div>
    </div>
    
    <div class="container">
      <div class="admin-wrapper">
        <!-- Search Section -->
        <div class="search-section">
          <div class="search-card">
            <h3 class="search-title">🔍 用户搜索</h3>
            <div class="search-filters">
              <div class="form-group">
                <label>📧 邮箱搜索</label>
                <input v-model="qEmail" placeholder="输入邮箱地址进行搜索" />
              </div>
              <div class="form-group">
                <label>🎓 学号搜索</label>
                <input v-model="qStudent" placeholder="输入学生号进行搜索" />
              </div>
              <div class="search-actions">
                <button class="search-btn primary" @click="load">
                  <span>🔍</span>
                  搜索用户
                </button>
                <button class="clear-btn secondary" @click="clearSearch">
                  <span>🗑️</span>
                  清空筛选
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Users Table Section -->
        <div class="table-section">
          <div class="table-card">
            <div class="table-header">
              <h3 class="table-title">📊 用户列表</h3>
              <div class="table-stats">
                <span class="stat-item">
                  <span class="stat-label">总用户数：</span>
                  <span class="stat-value">{{ users.length }}</span>
                </span>
              </div>
            </div>

            <div class="table-wrapper">
              <table class="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>邮箱</th>
                    <th>昵称</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
      <tbody>
                  <tr v-for="u in users" :key="u.id" class="user-row">
                    <td class="user-id">#{{ u.id }}</td>
                    <td class="user-email">{{ u.email }}</td>
                    <td class="user-nickname">{{ u.nickname }}</td>
                    <td class="user-role">
                      <select 
                        v-model="u.role" 
                        @change="update(u)"
                        class="role-select"
                        :class="`role-${u.role}`"
                      >
                        <option value="user">普通用户</option>
                        <option value="moderator">版主</option>
                        <option value="super_admin">超级管理员</option>
            </select>
          </td>
                    <td class="user-status">
                      <span class="status-badge" :class="u.banned ? 'banned' : 'normal'">
                        {{ u.banned ? '已封禁' : '正常' }}
                      </span>
                    </td>
                    <td class="user-actions">
                      <div class="action-buttons">
                        <button 
                          v-if="!u.banned"
                          @click="ban(u)" 
                          class="action-btn ban-btn"
                          title="封禁用户"
                        >
                          🚫 封禁
                        </button>
                        <button 
                          v-else
                          @click="unban(u)" 
                          class="action-btn unban-btn"
                          title="解封用户"
                        >
                          ✅ 解封
                        </button>
                        <button 
                          @click="banEmail(u.email)" 
                          class="action-btn danger-btn"
                          title="封禁邮箱"
                        >
                          📧 封邮箱
                        </button>
                        <button 
                          v-if="u.student_id" 
                          @click="banStudent(u.student_id)" 
                          class="action-btn danger-btn"
                          title="封禁学号"
                        >
                          🎓 封学号
                        </button>
                      </div>
          </td>
        </tr>
      </tbody>
    </table>

              <div v-if="users.length === 0" class="empty-state">
                <div class="empty-icon">👥</div>
                <h4>暂无用户数据</h4>
                <p>没有找到符合条件的用户，请尝试调整搜索条件</p>
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
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
 

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'
const auth = useAuthStore()
const users = ref<any[]>([])
const qEmail = ref('')
const qStudent = ref('')

 

async function load() {
  const res = await axios.get(`${API}/users`, { headers: { Authorization: `Bearer ${auth.token}` } })
  let items = res.data.items || []
  if (qEmail.value) items = items.filter((u:any) => String(u.email).includes(qEmail.value))
  if (qStudent.value) items = items.filter((u:any) => String(u.student_id||'').includes(qStudent.value))
  users.value = items
}

function clearSearch() {
  qEmail.value = ''
  qStudent.value = ''
  load()
}

async function update(u: any) {
  await axios.put(`${API}/users/${u.id}`, { role: u.role }, { headers: { Authorization: `Bearer ${auth.token}` } })
  await load()
}
async function ban(u: any) {
  await axios.post(`${API}/users/${u.id}/ban`, {}, { headers: { Authorization: `Bearer ${auth.token}` } })
  await load()
}
async function unban(u: any) {
  await axios.post(`${API}/users/${u.id}/unban`, {}, { headers: { Authorization: `Bearer ${auth.token}` } })
  await load()
}

async function banEmail(email:string){
  await axios.post(`${API}/bans`, { type:'email', value: email, stage: 3 }, { headers: { Authorization: `Bearer ${auth.token}` } })
  await load()
}
async function banStudent(studentId:string){
  await axios.post(`${API}/bans`, { type:'student_id', value: studentId, stage: 3 }, { headers: { Authorization: `Bearer ${auth.token}` } })
  await load()
}

onMounted(load)
</script>

<style scoped>
/* Admin Page Layout */
.admin-page {
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
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="admin-pattern" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="2" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23admin-pattern)"/></svg>');
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

/* Admin Wrapper */
.admin-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Search Section */
.search-section {
  width: 100%;
}

.search-card {
  background: var(--card-bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.search-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text);
  margin: 0 0 20px 0;
}

.search-filters {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 20px;
  align-items: end;
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

.form-group input {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  background: #fff;
  font-size: var(--font-size-base);
  transition: all 0.3s ease;
}

.form-group input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.form-group input:hover {
  border-color: var(--primary-300);
}

.search-actions {
  display: flex;
  gap: 12px;
}

.search-btn, .clear-btn {
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

.search-btn:hover, .clear-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
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

.table-stats {
  display: flex;
  gap: 20px;
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

/* Table Wrapper */
.table-wrapper {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.users-table th {
  background: var(--bg-solid);
  color: var(--text);
  font-weight: 600;
  padding: 16px 12px;
  text-align: left;
  border-bottom: 2px solid var(--border-light);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.users-table td {
  padding: 16px 12px;
  border-bottom: 1px solid var(--border-light);
  vertical-align: middle;
}

.user-row {
  transition: background-color 0.2s ease;
}

.user-row:hover {
  background: var(--primary-50);
}

.user-id {
  font-family: 'Monaco', 'Consolas', monospace;
  font-weight: 600;
  color: var(--muted);
}

.user-email {
  color: var(--text);
  font-weight: 500;
}

.user-nickname {
  color: var(--text);
  font-weight: 500;
}

/* Role Select */
.role-select {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: #fff;
  font-size: var(--font-size-xs);
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}

.role-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-100);
}

.role-select.role-user {
  color: var(--text-secondary);
  border-color: var(--border);
}

.role-select.role-moderator {
  color: var(--warning);
  border-color: var(--warning);
  background: rgba(245, 158, 11, 0.1);
}

.role-select.role-super_admin {
  color: var(--danger);
  border-color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}

/* Status Badge */
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-xs);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.normal {
  background: var(--success);
  color: white;
}

.status-badge.banned {
  background: var(--danger);
  color: white;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 10px;
  border: none;
  border-radius: var(--radius-xs);
  font-size: var(--font-size-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.ban-btn {
  background: var(--warning);
  color: white;
}

.ban-btn:hover {
  background: #d97706;
}

.unban-btn {
  background: var(--success);
  color: white;
}

.unban-btn:hover {
  background: #059669;
}

.danger-btn {
  background: var(--danger);
  color: white;
}

.danger-btn:hover {
  background: #dc2626;
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
  margin: 0;
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
  
  .search-filters {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .search-actions {
    justify-content: stretch;
  }
  
  .search-btn, .clear-btn {
    flex: 1;
    justify-content: center;
  }
  
  .table-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .users-table {
    font-size: var(--font-size-xs);
  }
  
  .users-table th,
  .users-table td {
    padding: 12px 8px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
  
  .action-btn {
    padding: 4px 8px;
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 16px;
  }
  
  .search-card,
  .table-card {
    margin: 0 -8px;
    border-radius: var(--radius-sm);
  }
  
  .search-card {
    padding: 20px;
  }
  
  .table-header {
    padding: 20px;
  }
  
  .users-table th,
  .users-table td {
    padding: 10px 6px;
  }
}
</style>


