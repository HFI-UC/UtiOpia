<template>
  <div>
    <header class="header">
      <h1>UtiOpia 留言墙</h1>
      <nav>
        <router-link to="/">主页</router-link>
        <router-link to="/moderation" v-if="me?.role !== 'user'">审核</router-link>
        <router-link to="/admin" v-if="me?.role === 'super_admin' || me?.role === 'moderator'">管理</router-link>
        <router-link to="/logs" v-if="me?.role === 'super_admin' || me?.role === 'moderator'">日志</router-link>
        <router-link to="/bans" v-if="me?.role === 'super_admin' || me?.role === 'moderator'">封禁</router-link>
      </nav>
      <div class="auth">
        <span v-if="me">你好，{{ me.nickname }} ({{ me.role }})</span>
        <router-link v-else to="/login">登录</router-link>
      </div>
    </header>
    <router-view />
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
</script>

<style scoped>
.header { display:flex; align-items:center; justify-content:space-between; gap: 16px; padding: 10px 16px; border-bottom: 1px solid #eee; }
nav { display:flex; gap: 12px; }
a { text-decoration: none; color: #333 }
a.router-link-active { font-weight: 700; }
</style>


