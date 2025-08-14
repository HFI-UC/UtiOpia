<template>
  <div>
    <header class="header">
      <div class="inner">
        <h1>UtiOpia 小纸条</h1>
        <nav>
          <router-link to="/">纸条</router-link>
          <router-link to="/write">写纸条</router-link>
          <router-link to="/moderation" v-if="me?.role === 'super_admin' || me?.role === 'moderator'">审核</router-link>
          <router-link to="/admin" v-if="me?.role === 'super_admin' || me?.role === 'moderator'">管理</router-link>
          <router-link to="/logs" v-if="me?.role === 'super_admin' || me?.role === 'moderator'">日志</router-link>
          <router-link to="/bans" v-if="me?.role === 'super_admin' || me?.role === 'moderator'">封禁</router-link>
        </nav>
        <div class="auth" v-if="!auth.isAuthed">
          <router-link to="/login">登录</router-link>
          <router-link to="/register">注册</router-link>
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
/* App specific styles - global header styles are in global.css */
.header {
  /* Styles are handled by global .header class */
}

/* Override some specific styles if needed */
.auth {
  /* Ensure auth section displays properly */
}
</style>


