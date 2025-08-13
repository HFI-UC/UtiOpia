<template>
  <div class="wrap">
    <h2>封禁管理</h2>
    <div class="row">
      <select v-model="type">
        <option value="email">email</option>
        <option value="student_id">student_id</option>
      </select>
      <input v-model="value" placeholder="值，如 xxx.yyy2023@gdhfi.com / GJ20xxxxxx" />
      <select v-model.number="stage">
        <option :value="1">阶段1（7天）</option>
        <option :value="2">阶段2（14天）</option>
        <option :value="3">阶段3（30天）</option>
        <option :value="4">阶段4（60天）</option>
        <option :value="5">阶段5（90天）</option>
      </select>
      <input v-model="reason" placeholder="原因（可选）" />
      
      <button @click="create">新增封禁</button>
      <button @click="remove">解除封禁</button>
      <p class="err" v-if="error">{{ error }}</p>
      <p class="ok" v-if="ok">{{ ok }}</p>
    </div>
  </div>
  <div class="list">
    <h3>最近封禁记录</h3>
    <table>
      <thead><tr><th>ID</th><th>类型</th><th>值</th><th>阶段</th><th>生效</th><th>到期</th><th>原因</th><th>时间</th></tr></thead>
      <tbody>
        <tr v-for="b in items" :key="b.id">
          <td>{{ b.id }}</td>
          <td>{{ b.type }}</td>
          <td>{{ b.value }}</td>
          <td>{{ b.stage ?? '-' }}</td>
          <td>{{ b.active ? '是' : '否' }}</td>
          <td>{{ b.expires_at || '-' }}</td>
          <td>{{ b.reason || '-' }}</td>
          <td>{{ b.created_at }}</td>
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
const type = ref<'email'|'student_id'>('email')
const value = ref('')
const stage = ref(1)
const reason = ref('')
 
const error = ref('')
const ok = ref('')
const items = ref<any[]>([])

async function create() {
  try {
    error.value = ''; ok.value = ''
    await axios.post(`${API}/bans`, { type: type.value, value: value.value, reason: reason.value, stage: stage.value }, { headers: { Authorization: `Bearer ${auth.token}` } })
    ok.value = '已封禁'
  } catch (e:any) {
    error.value = e.response?.data?.error || e.message
  }
}
async function remove() {
  try {
    error.value = ''; ok.value = ''
    await axios.delete(`${API}/bans`, { data: { type: type.value, value: value.value }, headers: { Authorization: `Bearer ${auth.token}` } as any })
    ok.value = '已解除'
  } catch (e:any) {
    error.value = e.response?.data?.error || e.message
  }
}

async function load() {
  const res = await axios.get(`${API}/bans`, { headers: { Authorization: `Bearer ${auth.token}` } })
  items.value = res.data.items || []
}

load()
</script>

<style scoped>
.wrap { max-width: 900px; margin:20px auto; }
.row { display:flex; gap:8px; align-items:center; flex-wrap:wrap }
input, select { padding:8px; border:1px solid #ddd; border-radius:6px; }
.err { color:#c00 }
.ok { color:#090 }
table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th, td { border:1px solid #eee; padding: 6px; text-align:left; }
</style>


