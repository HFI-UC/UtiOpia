<template>
  <div class="wrap">
    <h2>系统日志</h2>
    <div class="filters">
      <input v-model="action" placeholder="action 过滤，如 error" />
      <label><input type="checkbox" v-model="onlyError" /> 仅错误</label>
      <button @click="load">刷新</button>
    </div>
    <table>
      <thead>
        <tr><th>ID</th><th>Action</th><th>User</th><th>Meta</th><th>Time</th></tr>
      </thead>
      <tbody>
        <tr v-for="log in items" :key="log.id">
          <td>{{ log.id }}</td>
          <td>{{ log.action }}</td>
          <td>{{ log.user_id ?? '-' }}</td>
          <td><pre>{{ pretty(log.meta) }}</pre></td>
          <td>{{ log.created_at }}</td>
        </tr>
      </tbody>
    </table>
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

function pretty(v:any) { try { return JSON.stringify(v, null, 2) } catch { return String(v) } }

async function load() {
  const res = await axios.get(`${API}/logs`, { params: { action: action.value, only_error: onlyError.value ? 1 : 0 }, headers: { Authorization: `Bearer ${auth.token}` } })
  items.value = res.data.items || []
}

load()
</script>

<style scoped>
.wrap { max-width: 1000px; margin: 20px auto; }
.filters { display:flex; gap: 8px; align-items:center; margin-bottom: 12px; }
table { width: 100%; border-collapse: collapse; }
th, td { border:1px solid #eee; padding: 6px; text-align:left; vertical-align: top; }
pre { margin:0; white-space: pre-wrap; word-break: break-word; }
</style>


