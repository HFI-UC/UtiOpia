<template>
  <div class="login-page">
    <!-- Hero Header -->
    <div class="page-hero">
      <div class="hero-content">
        <h1 class="page-title">🔐 用户登录</h1>
        <p class="page-subtitle">欢迎回到 UtiOpia 小纸条</p>
      </div>
    </div>

    <div class="container">
      <div class="login-wrapper">
        <div class="login-card">
          <div class="card-header">
            <h2 class="card-title">登录账户</h2>
            <p class="card-subtitle">请输入您的邮箱和密码</p>
          </div>

          <form class="login-form" @submit.prevent="onSubmit">
            <div class="form-section">
              <div class="form-group">
                <label>📧 邮箱地址</label>
                <input 
                  v-model="email" 
                  type="email" 
                  required 
                  placeholder="your.name2023@gdhfi.com"
                  :class="{ 'input-error': error && !email }"
                />
              </div>

              <div class="form-group">
                <label>🔒 密码</label>
                <input 
                  v-model="password" 
                  type="password" 
                  required 
                  placeholder="请输入密码"
                  :class="{ 'input-error': error && !password }"
                />
              </div>

              <div class="form-group">
                <label>🔒 安全验证</label>
                <div class="turnstile-wrapper">
                  <Turnstile @verified="t => token = t" />
                </div>
              </div>

              <div class="form-group">
                <button 
                  type="submit" 
                  class="login-btn primary" 
                  :disabled="loading || !token"
                >
                  <span v-if="loading" class="btn-spinner"></span>
                  <span v-else>🚀</span>
                  {{ loading ? '登录中...' : '登录' }}
                </button>
              </div>

              <div v-if="error" class="error-section">
                <div class="error-message">
                  <span class="error-icon">⚠️</span>
                  {{ error }}
                </div>
              </div>
            </div>
          </form>

          <div class="card-footer">
            <p class="register-link">
              还没有账户？ 
              <router-link to="/register" class="link">注册新账户</router-link>
            </p>
          </div>
        </div>

        <!-- Info Card -->
        <div class="info-card">
          <h3 class="info-title">💡 登录说明</h3>
          <ul class="info-list">
            <li>请使用学校邮箱登录</li>
            <li>忘记密码请联系管理员</li>
            <li>首次使用需要先注册</li>
            <li>登录后可以实名或匿名发布纸条</li>
          </ul>
        </div>
      </div>
    </div>
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
/* Login Page Layout */
.login-page {
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
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="login-pattern" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23login-pattern)"/></svg>');
}

.hero-content {
  max-width: 600px;
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

/* Login Wrapper */
.login-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  max-width: 900px;
  margin: 0 auto;
}

/* Login Card */
.login-card {
  background: var(--card-bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.card-header {
  padding: 32px 32px 24px 32px;
  border-bottom: 1px solid var(--border-light);
  background: var(--gradient-card);
  text-align: center;
}

.card-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text);
  margin: 0 0 8px 0;
}

.card-subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  margin: 0;
  line-height: var(--line-height-relaxed);
}

/* Login Form */
.login-form {
  padding: 32px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
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
  margin-bottom: 4px;
}

.form-group input {
  padding: 14px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  background: #fff;
  font-size: var(--font-size-base);
  transition: all 0.3s ease;
}

.form-group input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-100);
  transform: translateY(-1px);
}

.form-group input:hover {
  border-color: var(--primary-300);
}

.form-group input::placeholder {
  color: var(--muted);
  font-size: var(--font-size-sm);
}

/* Turnstile Wrapper */
.turnstile-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: var(--bg-solid);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

/* Login Button */
.login-btn {
  width: 100%;
  padding: 16px 24px;
  font-size: var(--font-size-lg);
  font-weight: 600;
  border-radius: var(--radius-sm);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 56px;
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none !important;
}

.btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Error Section */
.error-section {
  margin-top: 8px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-sm);
  color: var(--danger);
  font-weight: 500;
}

.error-icon {
  font-size: 20px;
  flex-shrink: 0;
}

/* Card Footer */
.card-footer {
  padding: 24px 32px;
  background: var(--bg-solid);
  border-top: 1px solid var(--border-light);
  text-align: center;
}

.register-link {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s ease;
}

.link:hover {
  color: var(--primary-600);
  text-decoration: underline;
}

/* Info Card */
.info-card {
  background: var(--card-bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  height: fit-content;
  position: sticky;
  top: 100px;
}

.info-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text);
  margin: 0 0 16px 0;
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-list li {
  position: relative;
  padding: 8px 0 8px 24px;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
}

.info-list li::before {
  content: '💡';
  position: absolute;
  left: 0;
  top: 8px;
  font-size: 14px;
}

/* Mobile Responsiveness */
@media (max-width: 1024px) {
  .login-wrapper {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .info-card {
    position: static;
  }
}

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
  
  .login-form {
    padding: 24px;
  }
  
  .card-header {
    padding: 24px;
  }
  
  .form-section {
    gap: 20px;
  }
  
  .login-btn {
    padding: 14px 20px;
    font-size: var(--font-size-base);
    min-height: 48px;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 16px;
  }
  
  .login-form {
    padding: 20px;
  }
  
  .card-header {
    padding: 20px;
  }
  
  .card-footer {
    padding: 20px;
  }
}
</style>


