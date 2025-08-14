<template>
  <div class="register-page">
    <!-- Hero Header -->
    <div class="page-hero">
      <div class="hero-content">
        <h1 class="page-title">📝 用户注册</h1>
        <p class="page-subtitle">加入 UtiOpia 小纸条，开始分享你的心声</p>
      </div>
    </div>

    <div class="container">
      <div class="register-wrapper">
        <div class="register-card">
          <div class="card-header">
            <h2 class="card-title">创建新账户</h2>
            <p class="card-subtitle">请填写以下信息完成注册</p>
          </div>

          <form class="register-form" @submit.prevent="onSubmit">
            <div class="form-section">
              <div class="grid-2">
                <div class="form-group">
                  <label>📧 学校邮箱</label>
                  <input 
                    v-model="email" 
                    type="email" 
                    required 
                    placeholder="firstname.lastname2023@gdhfi.com"
                    :class="{ 'input-error': error && !email }"
                  />
                  <div class="form-hint">请使用学校官方邮箱</div>
                </div>

                <div class="form-group">
                  <label>🎓 学生号</label>
                  <input 
                    v-model="studentId" 
                    required 
                    placeholder="GJ20120124"
                    :class="{ 'input-error': error && !studentId }"
                  />
                  <div class="form-hint">格式：GJ + 年份 + 4位数字</div>
                </div>
              </div>

              <div class="form-group">
                <label>👤 昵称</label>
                <input 
                  v-model="nickname" 
                  maxlength="50" 
                  required 
                  placeholder="请输入您的昵称"
                  :class="{ 'input-error': error && !nickname }"
                />
                <div class="form-hint">最多50个字符，用于显示身份</div>
              </div>

              <div class="form-group">
                <label>🔒 密码</label>
                <input 
                  v-model="password" 
                  type="password" 
                  minlength="6" 
                  required 
                  placeholder="请设置至少6位密码"
                  :class="{ 'input-error': error && !password }"
                />
                <div class="form-hint">至少6个字符，建议包含字母和数字</div>
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
                  class="register-btn primary" 
                  :disabled="loading || !token"
                >
                  <span v-if="loading" class="btn-spinner"></span>
                  <span v-else>🚀</span>
                  {{ loading ? '注册中...' : '立即注册' }}
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
            <p class="login-link">
              已有账户？ 
              <router-link to="/login" class="link">立即登录</router-link>
            </p>
          </div>
        </div>

        <!-- Info Card -->
        <div class="info-card">
          <h3 class="info-title">📋 注册须知</h3>
          <ul class="info-list">
            <li>仅限学校师生注册使用</li>
            <li>邮箱格式需符合学校规范</li>
            <li>学生号格式：GJ + 年份 + 4位数字</li>
            <li>注册成功后可选择匿名或实名发布</li>
            <li>请遵守社区规范，文明发言</li>
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
const nickname = ref('')
const password = ref('')
const token = ref('')
const loading = ref(false)
const error = ref('')
const studentId = ref('')
const auth = useAuthStore()
const router = useRouter()

async function onSubmit() {
  try {
    loading.value = true
    error.value = ''
    const emailPattern = /^[a-z]+\.[a-z]+20\d{2}@gdhfi\.com$/
    if (!emailPattern.test(email.value)) {
      throw new Error('邮箱需符合学校规则')
    }
    const idPattern = /^GJ20\d{2}\d{4}$/
    if (!idPattern.test(studentId.value)) {
      throw new Error('学生号格式不正确')
    }
    await auth.register(email.value, password.value, nickname.value, studentId.value, token.value)
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
/* Register Page Layout */
.register-page {
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
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="register-pattern" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="12.5" cy="12.5" r="1.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23register-pattern)"/></svg>');
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

/* Register Wrapper */
.register-wrapper {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
  max-width: 1000px;
  margin: 0 auto;
}

/* Register Card */
.register-card {
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

/* Register Form */
.register-form {
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

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--muted);
  margin-top: 4px;
}

/* Grid Layout */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
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

/* Register Button */
.register-btn {
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

.register-btn:disabled {
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

.login-link {
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
  content: '📋';
  position: absolute;
  left: 0;
  top: 8px;
  font-size: 14px;
}

/* Mobile Responsiveness */
@media (max-width: 1024px) {
  .register-wrapper {
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
  
  .register-form {
    padding: 24px;
  }
  
  .card-header {
    padding: 24px;
  }
  
  .form-section {
    gap: 20px;
  }
  
  .grid-2 {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .register-btn {
    padding: 14px 20px;
    font-size: var(--font-size-base);
    min-height: 48px;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 16px;
  }
  
  .register-form {
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


