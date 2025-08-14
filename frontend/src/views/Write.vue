<template>
  <div class="container">
    <div class="composer" id="compose">
      <div class="row" v-if="authed">
        <label><input type="checkbox" v-model="isAnonymousMutable"/> 匿名发布</label>
      </div>
      <div v-if="isAnonymous && !authed" class="anon-grid">
        <input v-model="anonEmail" placeholder="学校邮箱" />
        <input v-model="anonStudentId" placeholder="学生号" />
        <input v-model="anonPassphrase" type="password" placeholder="身份口令 (用于编辑/删除)" />
      </div>
      <textarea v-model="content" maxlength="500" placeholder="写点什么..."/>
      <div class="upload" @dragover.prevent @drop.prevent="onDrop">
        <label class="u-btn">
          <input class="u-input" type="file" accept="image/*" @change="pickFile"/>
          选择图片
        </label>
        <span class="u-hint">{{ fileName || '未选择文件' }}</span>
        <img v-if="imageUrl" class="u-preview" :src="imageUrl" alt="preview" />
      </div>
      <Turnstile @verified="t => turnstileToken = t" />
      <button class="primary" :disabled="loading" @click="submit">投递纸条</button>
      <p class="err" v-if="error">{{ error }}</p>
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
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    alert('文件过大，最大 5MB')
    return
  }
  fileName.value = file.name
  uploadViaCOS(file)
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
      if (!confirm('你将以实名发布。其他用户可以看到“由你发布”的标识。是否继续？')) {
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
    alert('提交成功，等待审核')
  } catch (e: any) {
    error.value = e.message || '发布失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.composer { display:flex; flex-direction:column; gap:10px; max-width:680px; margin:20px auto; }
textarea { min-height: 100px; }
.upload { display:flex; align-items:center; gap:10px; flex-wrap: wrap; }
.upload .u-input { position:absolute; width:1px; height:1px; opacity:0; }
.upload .u-btn { display:inline-block; padding:10px 14px; border-radius: var(--radius-sm); border:1px dashed var(--primary); color: var(--primary); cursor:pointer; background:#fff; }
.upload .u-btn:hover { background: rgba(47,84,235,.06); }
.upload .u-hint { color: var(--muted); }
.upload .u-preview { max-height: 120px; border-radius: 10px; box-shadow: var(--shadow-sm); }
.err { color: var(--danger); }
</style>


