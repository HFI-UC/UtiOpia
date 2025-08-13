<template>
  <div class="wrap">
    <h2>登录</h2>
    <form @submit.prevent="onSubmit">
      <label>邮箱</label>
      <input v-model="email" type="email" required />
      <label>密码</label>
      <input v-model="password" type="password" required />
      <Turnstile @verified="t => token = t" />
      <button :disabled="loading">登录</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import Turnstile from '../components/Turnstile.vue'

const email = ref('')
const password = ref('')
const token = ref('')
const loading = ref(false)
const error = ref('')
const auth = useAuthStore()
const router = useRouter()

// 由组件回调设置 token

async function onSubmit() {
  try {
    loading.value = true
    error.value = ''
    await auth.login(email.value, password.value, token.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.wrap { max-width: 360px; margin: 40px auto; display:flex; flex-direction:column; gap:8px; }
label { font-size: 12px; color:#666 }
input { padding: 8px; border:1px solid #ddd; border-radius:6px; }
button { padding: 10px; }
.error { color: #c00 }
</style>


