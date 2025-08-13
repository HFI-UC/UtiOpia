<template>
  <div class="wrap">
    <h2>审核队列</h2>
    <div class="row">
      <select v-model="status" @change="onFilter">
        <option value="pending">待审核</option>
        <option value="rejected">已拒绝</option>
        <option value="approved">已通过</option>
        <option value="all">全部</option>
      </select>
      <button @click="refresh">刷新</button>
    </div>
    <Turnstile @verified="t => token = t" />
    <div v-for="m in items" :key="m.id" class="item">
      <p>{{ m.content }}</p>
      <img v-if="m.image_url" :src="m.image_url" />
      <div class="meta" v-if="m.is_anonymous">
        <small>匿名邮箱：{{ m.anon_email }} · 学号：{{ m.anon_student_id }}</small>
      </div>
      <div class="ops">
        <button @click="approve(m.id)">通过</button>
        <button @click="reject(m.id)">拒绝</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import Turnstile from '../components/Turnstile.vue'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'
const auth = useAuthStore()
const items = ref<any[]>([])
const token = ref('')
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
  await axios.post(`${API}/messages/${id}/approve`, { turnstile_token: token.value }, { headers: { Authorization: `Bearer ${auth.token}` } })
  await fetch(true)
}
async function reject(id: number) {
  const reason = prompt('拒绝理由：') || ''
  await axios.post(`${API}/messages/${id}/reject`, { reason, turnstile_token: token.value }, { headers: { Authorization: `Bearer ${auth.token}` } })
  await fetch(true)
}

fetch(true)
</script>

<style scoped>
.wrap { max-width: 800px; margin: 20px auto; display:flex; flex-direction:column; gap: 12px; }
.row { display:flex; gap: 8px; }
.item { border:1px solid #eee; border-radius: 8px; padding: 12px; }
img { max-height: 100px; border-radius: 6px; }
</style>


