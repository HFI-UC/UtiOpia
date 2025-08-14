<template>
  <div>
    <header class="header">
      <div class="inner">
        <h1>UtiOpia 小纸条</h1>
        <nav>
          <router-link to="/">纸条</router-link>
          <router-link to="/write">写纸条</router-link>
          <router-link to="/moderation" v-if="me?.role !== 'user'">审核</router-link>
          <router-link to="/admin" v-if="me?.role === 'super_admin' || me?.role === 'moderator'">管理</router-link>
          <router-link to="/logs" v-if="me?.role === 'super_admin' || me?.role === 'moderator'">日志</router-link>
          <router-link to="/bans" v-if="me?.role === 'super_admin' || me?.role === 'moderator'">封禁</router-link>
        </nav>
        <div class="auth" v-if="!auth.isAuthed">
          <router-link to="/login">登录</router-link>
        </div>
      </div>
    </header>
    <main class="container">
      <router-view />
    </main>
    <Toast ref="toastRef" />
  </div>
  </template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from './stores/auth'
import Toast from './components/Toast.vue'

const auth = useAuthStore()
const me = ref(auth.user)

onMounted(async () => {
  await auth.fetchMe()
  me.value = auth.user
})

const toastRef = ref<InstanceType<typeof Toast> | null>(null)
// 全局简易挂载
;(window as any).$toast = {
  info: (t:string)=>toastRef.value?.push(t,'info'),
  success: (t:string)=>toastRef.value?.push(t,'success'),
  error: (t:string)=>toastRef.value?.push(t,'error')
}

function writeNote() {
  const el = document.querySelector('#compose')
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
.header { position:sticky; top:0; backdrop-filter:saturate(180%) blur(8px); background:rgba(255,255,255,.8); display:flex; align-items:center; justify-content:space-between; gap: 16px; padding: 12px 20px; border-bottom: 1px solid #f0f0f0; }
h1 { font-size:18px; letter-spacing:.5px; }
nav { display:flex; gap: 14px; }
a { text-decoration: none; color: #2a2a2a }
a.router-link-active { font-weight: 700; color:#2f54eb }
.auth a { padding:8px 12px; border:1px solid #2f54eb; color:#2f54eb; border-radius:8px; }
</style>


