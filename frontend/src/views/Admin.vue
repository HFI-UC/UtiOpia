<template>
  <div class="wrap">
    <h2>用户管理</h2>
    <div class="filters">
      <input v-model="qEmail" placeholder="邮箱搜索" />
      <input v-model="qStudent" placeholder="学号搜索" />
      <button @click="load">搜索</button>
    </div>
    <Turnstile @verified="t => token = t" />
    <table>
      <thead><tr><th>ID</th><th>邮箱</th><th>昵称</th><th>角色</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.id }}</td>
          <td>{{ u.email }}</td>
          <td>{{ u.nickname }}</td>
          <td>
            <select v-model="u.role" @change="update(u)">
              <option value="user">user</option>
              <option value="moderator">moderator</option>
              <option value="super_admin">super_admin</option>
            </select>
          </td>
          <td>{{ u.banned ? '封禁' : '正常' }}</td>
          <td>
            <button @click="ban(u)" v-if="!u.banned">封禁</button>
            <button @click="unban(u)" v-else>解封</button>
            <button @click="banEmail(u.email)">封禁邮箱</button>
            <button v-if="u.student_id" @click="banStudent(u.student_id)">封禁学号</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import Turnstile from '../components/Turnstile.vue'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'
const auth = useAuthStore()
const users = ref<any[]>([])
let token = ''
const qEmail = ref('')
const qStudent = ref('')

;(window as any).onTurnstile = (t: string) => token = t

async function load() {
  const res = await axios.get(`${API}/users`, { headers: { Authorization: `Bearer ${auth.token}` } })
  let items = res.data.items || []
  if (qEmail.value) items = items.filter((u:any) => String(u.email).includes(qEmail.value))
  if (qStudent.value) items = items.filter((u:any) => String(u.student_id||'').includes(qStudent.value))
  users.value = items
}

async function update(u: any) {
  await axios.put(`${API}/users/${u.id}`, { role: u.role, turnstile_token: token }, { headers: { Authorization: `Bearer ${auth.token}` } })
  await load()
}
async function ban(u: any) {
  await axios.post(`${API}/users/${u.id}/ban`, { turnstile_token: token }, { headers: { Authorization: `Bearer ${auth.token}` } })
  await load()
}
async function unban(u: any) {
  await axios.post(`${API}/users/${u.id}/unban`, { turnstile_token: token }, { headers: { Authorization: `Bearer ${auth.token}` } })
  await load()
}

async function banEmail(email:string){
  await axios.post(`${API}/bans`, { type:'email', value: email, stage: 3, turnstile_token: token }, { headers: { Authorization: `Bearer ${auth.token}` } })
  await load()
}
async function banStudent(studentId:string){
  await axios.post(`${API}/bans`, { type:'student_id', value: studentId, stage: 3, turnstile_token: token }, { headers: { Authorization: `Bearer ${auth.token}` } })
  await load()
}

onMounted(load)
</script>

<style scoped>
.wrap { max-width: 900px; margin: 20px auto; }
.filters { display:flex; gap:8px; align-items:center; margin-bottom:8px }
table { width: 100%; border-collapse: collapse; }
th, td { border:1px solid #eee; padding: 8px; }
</style>


