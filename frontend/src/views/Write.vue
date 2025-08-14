<template>
  <div class="write-page">
    <!-- Hero Header -->
    <div class="page-hero">
      <div class="hero-content">
        <h1 class="page-title">✍️ 写纸条</h1>
        <p class="page-subtitle">分享你的想法，让心声传达到更远的地方</p>
      </div>
    </div>

    <div class="container">
      <div class="compose-wrapper">
        <div class="compose-card">
          <div class="card-header">
            <h2 class="card-title">创建新纸条</h2>
            <div class="card-subtitle">写下你想分享的内容，可以是想法、心情或者有趣的故事</div>
          </div>

          <form class="compose-form" @submit.prevent="submit">
            <!-- Auth Options -->
            <div class="form-section" v-if="authed">
              <div class="form-group">
                <div class="checkbox-group">
                  <input type="checkbox" id="anonymous" v-model="isAnonymousMutable"/>
                  <label for="anonymous" class="checkbox-label">
                    <span class="checkbox-icon">🕶️</span>
                    匿名发布
                    <span class="checkbox-hint">其他用户将看不到你的身份</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Anonymous User Info -->
            <div class="form-section" v-if="isAnonymous && !authed">
              <div class="section-header">
                <h3>👤 身份信息</h3>
                <p>请填写基本信息用于身份验证</p>
              </div>
              <div class="grid-2">
                <div class="form-group">
                  <label>学校邮箱</label>
                  <input v-model="anonEmail" type="email" placeholder="your.email@school.edu" />
                </div>
                <div class="form-group">
                  <label>学生号</label>
                  <input v-model="anonStudentId" placeholder="202X0123456" />
                </div>
              </div>
              <div class="form-group">
                <label>身份口令</label>
                <input v-model="anonPassphrase" type="password" placeholder="用于编辑和删除的口令" />
                <div class="form-hint">请记住此口令，用于后续编辑或删除纸条</div>
              </div>
            </div>

            <!-- Content -->
            <div class="form-section">
              <div class="form-group">
                <label>
                  <span class="label-text">内容</span>
                  <span class="label-counter">{{ content.length }}/500</span>
                </label>
                <div class="textarea-wrapper">
                  <textarea 
                    v-model="content" 
                    maxlength="500" 
                    placeholder="写下你想说的话...&#10;&#10;可以是：&#10;💭 一个有趣的想法&#10;😊 今天的心情&#10;📚 学习感悟&#10;🎵 喜欢的歌词&#10;或者任何你想分享的内容"
                    :class="{ 'input-error': content.length > 500 }"
                  ></textarea>
                  <div class="textarea-tools">
                    <button type="button" class="tool-btn" @click="content += '😊'" title="添加表情">😊</button>
                    <button type="button" class="tool-btn" @click="content += '💝'" title="添加表情">💝</button>
                    <button type="button" class="tool-btn" @click="content += '🎉'" title="添加表情">🎉</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Image Upload -->
            <div class="form-section">
              <div class="form-group">
                <label>📷 图片 (可选)</label>
                <div class="upload-area" 
                     @dragover.prevent @drop.prevent="onDrop"
                     :class="{ 'drag-active': isDragActive }">
                  <div class="upload-content">
                    <div v-if="!imageUrl" class="upload-placeholder">
                      <div class="upload-icon">📸</div>
                      <div class="upload-text">
                        <p>拖拽图片到这里或 <label class="upload-link">
                          <input class="upload-input" type="file" accept="image/*" @change="pickFile"/>
                          点击选择
                        </label></p>
                        <p class="upload-hint">支持 JPG、PNG 格式，最大 5MB</p>
                      </div>
                    </div>
                    <div v-else class="upload-preview">
                      <img :src="imageUrl" alt="预览图" />
                      <div class="preview-overlay">
                        <button type="button" class="btn-ghost" @click="removeImage">
                          <span>🗑️</span>
                          移除图片
                        </button>
                        <label class="btn-ghost">
                          <input class="upload-input" type="file" accept="image/*" @change="pickFile"/>
                          <span>🔄</span>
                          重新选择
                        </label>
                      </div>
                    </div>
                  </div>
                  <div v-if="fileName && !imageUrl" class="upload-status">
                    <span class="file-name">{{ fileName }}</span>
                    <span class="upload-progress">上传中...</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Security -->
            <div class="form-section">
              <div class="form-group">
                <label>🔒 安全验证</label>
                <div class="turnstile-wrapper">
                  <Turnstile @verified="t => turnstileToken = t" />
                </div>
              </div>
            </div>

            <!-- Submit -->
            <div class="form-section">
              <div class="submit-area">
                <button type="submit" class="submit-btn primary" :disabled="loading || !canSubmit">
                  <span v-if="loading" class="btn-spinner"></span>
                  <span v-else>📤</span>
                  {{ loading ? '发布中...' : '发布纸条' }}
                </button>
                <div class="submit-hint">
                  发布后需要等待审核通过才会显示
                </div>
              </div>
            </div>

            <!-- Error Display -->
            <div v-if="error" class="error-section">
              <div class="error-message">
                <span class="error-icon">⚠️</span>
                {{ error }}
              </div>
            </div>
          </form>
        </div>

        <!-- Tips Card -->
        <div class="tips-card">
          <h3 class="tips-title">💡 小贴士</h3>
          <ul class="tips-list">
            <li>内容应当积极向上，遵守社区规范</li>
            <li>支持换行和简单的文本格式</li>
            <li>图片会自动压缩到合适大小</li>
            <li>匿名发布时请记住身份口令</li>
            <li>所有内容都会经过审核</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import Turnstile from '../components/Turnstile.vue'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'
const auth = useAuthStore()
const authed = computed(() => !!auth.token)
const content = ref('')
const imageUrl = ref('')
const turnstileToken = ref('')
const loading = ref(false)
const error = ref('')
const isAnonymousMutable = ref(false)
const isAnonymous = computed(() => authed.value ? isAnonymousMutable.value : true)
const anonEmail = ref('')
const anonStudentId = ref('')
const anonPassphrase = ref('')
const fileName = ref('')
const isDragActive = ref(false)

const canSubmit = computed(() => {
  if (!content.value.trim()) return false
  if (!turnstileToken.value) return false
  if (isAnonymous.value && !authed.value) {
    return anonEmail.value && anonStudentId.value && anonPassphrase.value
  }
  return true
})

function pickFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    alert('文件过大，最大 5MB')
    return
  }
  fileName.value = file.name
  uploadViaCOS(file)
}

function onDrop(e: DragEvent) {
  isDragActive.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    ;(window as any).$toast?.error('文件过大，最大 5MB')
    return
  }
  fileName.value = file.name
  uploadViaCOS(file)
}

function removeImage() {
  imageUrl.value = ''
  fileName.value = ''
}

async function uploadViaCOS(file: File) {
  const authHeaders: any = auth.token ? { Authorization: `Bearer ${auth.token}` } : {}
  const res = await axios.post(`${API}/upload/presign`, { filename: file.name, size: file.size }, { headers: authHeaders })
  if (res.data.error) throw new Error(res.data.error)
  const { upload_url, headers: uploadHeaders, public_url } = res.data
  await fetch(upload_url, { method: 'PUT', headers: uploadHeaders, body: file })
  imageUrl.value = public_url
}

async function submit() {
  try {
    loading.value = true
    const payload: any = { content: content.value, image_url: imageUrl.value, turnstile_token: turnstileToken.value, is_anonymous: isAnonymous.value }
    if (isAnonymous.value && !authed.value) {
      payload.anon_email = anonEmail.value
      payload.anon_student_id = anonStudentId.value
      payload.anon_passphrase = anonPassphrase.value
    }
    if (!isAnonymous.value && authed.value) {
      if (!confirm('你将以实名发布。其他用户可以看到"由你发布"的标识。是否继续？')) {
        loading.value = false
        return
      }
    }
    const headers: any = auth.token ? { Authorization: `Bearer ${auth.token}` } : {}
    const res = await axios.post(`${API}/messages`, payload, { headers })
    if (res.data.error) throw new Error(res.data.error)
    content.value = ''
    imageUrl.value = ''
    fileName.value = ''
    anonEmail.value = ''
    anonStudentId.value = ''
    anonPassphrase.value = ''
    error.value = ''
    ;(window as any).$toast?.success('纸条发布成功，正在等待审核！')
  } catch (e: any) {
    error.value = e.message || '发布失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Page Layout */
.write-page {
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
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
}

.hero-content {
  max-width: 800px;
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

/* Compose Wrapper */
.compose-wrapper {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Compose Card */
.compose-card {
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

/* Form Styling */
.compose-form {
  padding: 32px;
}

.form-section {
  margin-bottom: 32px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-header {
  margin-bottom: 20px;
}

.section-header h3 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}

.section-header p {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}

/* Checkbox Group */
.checkbox-group {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 20px;
  background: var(--primary-50);
  border: 1px solid var(--primary-200);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.checkbox-group input[type="checkbox"] {
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: var(--primary);
}

.checkbox-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  flex: 1;
}

.checkbox-icon {
  margin-right: 8px;
  font-size: 18px;
}

.checkbox-hint {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: normal;
}

/* Form Labels */
label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: var(--text);
  font-size: var(--font-size-sm);
  margin-bottom: 8px;
}

.label-text {
  flex: 1;
}

.label-counter {
  font-size: var(--font-size-xs);
  color: var(--muted);
  font-weight: normal;
}

/* Textarea Wrapper */
.textarea-wrapper {
  position: relative;
}

.textarea-wrapper textarea {
  min-height: 200px;
  resize: vertical;
  padding-bottom: 50px;
  font-family: inherit;
  line-height: var(--line-height-relaxed);
}

.textarea-tools {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
}

.tool-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-solid);
  border-radius: var(--radius-xs);
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-btn:hover {
  background: var(--primary-100);
  transform: scale(1.1);
}

/* Upload Area */
.upload-area {
  border: 2px dashed var(--border);
  border-radius: var(--radius-sm);
  padding: 24px;
  transition: all 0.3s ease;
  background: var(--bg-solid);
}

.upload-area:hover,
.upload-area.drag-active {
  border-color: var(--primary);
  background: var(--primary-50);
}

.upload-content {
  text-align: center;
}

.upload-placeholder {
  padding: 20px;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text p {
  margin: 0 0 8px 0;
  color: var(--text-secondary);
}

.upload-link {
  color: var(--primary);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.upload-hint {
  font-size: var(--font-size-xs);
  color: var(--muted);
}

.upload-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

/* Upload Preview */
.upload-preview {
  position: relative;
  border-radius: var(--radius-sm);
  overflow: hidden;
  max-width: 300px;
  margin: 0 auto;
}

.upload-preview img {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.upload-preview:hover .preview-overlay {
  opacity: 1;
}

.preview-overlay button,
.preview-overlay label {
  background: white;
  color: var(--text);
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-xs);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-overlay button:hover,
.preview-overlay label:hover {
  background: var(--bg-solid);
  transform: scale(1.05);
}

/* Upload Status */
.upload-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding: 8px 16px;
  background: var(--primary-100);
  border-radius: var(--radius-xs);
}

.file-name {
  font-size: var(--font-size-sm);
  color: var(--primary);
  font-weight: 500;
}

.upload-progress {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
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

/* Submit Area */
.submit-area {
  text-align: center;
  padding: 24px 0;
}

.submit-btn {
  padding: 16px 48px;
  font-size: var(--font-size-lg);
  font-weight: 600;
  min-width: 200px;
  position: relative;
}

.btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.submit-hint {
  margin-top: 12px;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* Error Section */
.error-section {
  margin-top: 20px;
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

/* Tips Card */
.tips-card {
  background: var(--card-bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  height: fit-content;
  position: sticky;
  top: 100px;
}

.tips-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text);
  margin: 0 0 16px 0;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  position: relative;
  padding: 8px 0 8px 24px;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
}

.tips-list li::before {
  content: '💡';
  position: absolute;
  left: 0;
  top: 8px;
  font-size: 14px;
}

/* Mobile Responsiveness */
@media (max-width: 1024px) {
  .compose-wrapper {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .tips-card {
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
  
  .compose-form {
    padding: 24px;
  }
  
  .card-header {
    padding: 24px;
  }
  
  .form-section {
    margin-bottom: 24px;
  }
  
  .textarea-wrapper textarea {
    min-height: 150px;
  }
  
  .submit-btn {
    padding: 14px 32px;
    font-size: var(--font-size-base);
    min-width: 160px;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 16px;
  }
  
  .compose-form {
    padding: 20px;
  }
  
  .card-header {
    padding: 20px;
  }
  
  .upload-area {
    padding: 16px;
  }
  
  .checkbox-group {
    padding: 16px;
  }
}
</style>


