<template>
  <div class="wrap">
    <h2>注册</h2>
    <form @submit.prevent="onSubmit">
      <label>邮箱</label>
      <input v-model="email" type="email" required placeholder="学校邮箱"/>
      <label>昵称</label>
      <input v-model="nickname" maxlength="50" required />
      <label>密码</label>
      <input v-model="password" type="password" minlength="6" required />
      <Turnstile @verified="t => token = t" />
      <button :disabled="loading">注册</button>
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
const nickname = ref('')
const password = ref('')
const token = ref('')
const loading = ref(false)
const error = ref('')
const auth = useAuthStore()
const router = useRouter()

async function onSubmit() {
  try {
    loading.value = true
    error.value = ''
    const pattern = /^[a-z]+\.[a-z]+20\d{2}@gdhfi\.com$/
    if (!pattern.test(email.value)) {
      throw new Error('邮箱需符合学校规则')
    }
    await auth.register(email.value, password.value, nickname.value, token.value)
    await auth.login(email.value, password.value, token.value)
    router.push('/')
  } catch (e:any) {
    error.value = e.message || '注册失败'
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


