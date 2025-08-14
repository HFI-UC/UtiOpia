<template>
  <div class="home">
    <div class="composer" id="compose">
      <div class="row" v-if="authed">
        <label><input type="checkbox" v-model="isAnonymousMutable"/> 匿名发布</label>
      </div>
      <div v-if="isAnonymous" class="anon-grid">
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

    <div class="list">
      <div v-for="m in messages" :key="m.id" class="item">
        <p class="note">{{ m.content }}</p>
        <img v-if="m.image_url" :src="m.image_url" />
        <small>{{ m.created_at }} · {{ m.status }}</small>
        <div class="ops">
          <button @click="onOpenEdit(m)" v-if="canEdit(m)">编辑</button>
          <button @click="onOpenDelete(m)" v-if="canEdit(m)">删除</button>
        </div>
      </div>
      <div class="loading" v-if="isLoading">加载中...</div>
      <div class="done" v-else-if="isDone">已加载全部</div>
      <!-- dialogs inside template -->
      <Dialog :open="showEdit" @close="showEdit=false" @confirm="doEdit">
        <template #title>编辑留言</template>
        <div class="dlg-field">
          <label>内容</label>
          <textarea v-model="formContent" rows="5"></textarea>
          <template v-if="current && !current.user_id && current.is_anonymous">
            <label>身份口令</label>
            <input v-model="formPass" type="password" placeholder="用于验证匿名身份" />
          </template>
        </div>
      </Dialog>

      <Dialog :open="showDelete" @close="showDelete=false" @confirm="doDelete">
        <template #title>删除留言</template>
        <div class="dlg-field">
          <p>确定删除这条留言吗？该操作不可恢复。</p>
          <template v-if="current && !current.user_id && current.is_anonymous">
            <label>身份口令</label>
            <input v-model="formPass" type="password" placeholder="用于验证匿名身份" />
          </template>
        </div>
      </Dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import Turnstile from '../components/Turnstile.vue'
import Dialog from '../components/Dialog.vue'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'
const auth = useAuthStore()
const authed = computed(() => !!auth.token)
const content = ref('')
const imageUrl = ref('')
const turnstileToken = ref('')
const loading = ref(false)
const error = ref('')
const messages = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const isLoading = ref(false)
const isDone = ref(false)
const isAnonymousMutable = ref(false)
const isAnonymous = computed(() => authed.value ? isAnonymousMutable.value : true)
const fileName = ref('')
const anonEmail = ref('')
const anonStudentId = ref('')
const anonPassphrase = ref('')

async function fetchMessages(reset=false) {
  if (isLoading.value) return
  isLoading.value = true
  try {
    if (reset) { page.value = 1; isDone.value = false; messages.value = [] }
    const res = await axios.get(`${API}/messages`, { params: { page: page.value, pageSize: pageSize.value }, headers: { Authorization: `Bearer ${auth.token}` } })
    const items = res.data.items || []
    total.value = res.data.total || 0
    messages.value = messages.value.concat(items)
    if (messages.value.length >= total.value) isDone.value = true
    page.value += 1
  } catch (e:any) {
    (window as any).$toast?.error(e.response?.data?.error || e.message)
  } finally {
    isLoading.value = false
  }
}

function pickFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  fileName.value = file.name
  uploadViaCOS(file)
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  fileName.value = file.name
  uploadViaCOS(file)
}

async function uploadViaCOS(file: File) {
  // 1. 获取预签名 URL
  const authHeaders: any = auth.token ? { Authorization: `Bearer ${auth.token}` } : {}
  const res = await axios.post(`${API}/upload/presign`, { filename: file.name }, { headers: authHeaders })
  if (res.data.error) throw new Error(res.data.error)
  const { upload_url, headers: uploadHeaders, public_url } = res.data
  // 2. 直传 COS
  await fetch(upload_url, { method: 'PUT', headers: uploadHeaders, body: file })
  imageUrl.value = public_url
}

async function submit() {
  try {
    loading.value = true
    const payload: any = { content: content.value, image_url: imageUrl.value, turnstile_token: turnstileToken.value, is_anonymous: isAnonymous.value }
    if (isAnonymous.value) {
      payload.anon_email = anonEmail.value
      payload.anon_student_id = anonStudentId.value
      payload.anon_passphrase = anonPassphrase.value
    }
    const headers: any = auth.token ? { Authorization: `Bearer ${auth.token}` } : {}
    const res = await axios.post(`${API}/messages`, payload, { headers })
    if (res.data.error) throw new Error(res.data.error)
    content.value = ''
    imageUrl.value = ''
    await fetchMessages()
  } catch (e: any) {
    error.value = e.message || '发布失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMessages(true)
  window.addEventListener('scroll', onScroll)
})

function onScroll() {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200
  if (nearBottom && !isDone.value) fetchMessages()
}

function canEdit(m:any) {
  if (auth.user && m.user_id === auth.user.id) return true
  if (!m.user_id && m.is_anonymous) return true
  return false
}

const showEdit = ref(false)
const showDelete = ref(false)
const formContent = ref('')
const formPass = ref('')
let current: any = null

function onOpenEdit(m:any) { current = m; formContent.value = m.content; formPass.value = ''; showEdit.value = true }
function onOpenDelete(m:any) { current = m; formPass.value = ''; showDelete.value = true }

async function doEdit() {
  if (!current) return
  const body:any = { content: formContent.value, turnstile_token: turnstileToken.value }
  if (!current.user_id && current.is_anonymous) body.anon_passphrase = formPass.value
  await axios.put(`${API}/messages/${current.id}`, body, { headers: { Authorization: `Bearer ${auth.token}` } })
  showEdit.value = false
  await fetchMessages()
}
async function doDelete() {
  if (!current) return
  const body:any = { turnstile_token: turnstileToken.value }
  if (!current.user_id && current.is_anonymous) body.anon_passphrase = formPass.value
  await axios.delete(`${API}/messages/${current.id}`, { data: body, headers: { Authorization: `Bearer ${auth.token}` } as any })
  showDelete.value = false
  await fetchMessages()
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
.list { max-width: 760px; margin: 20px auto; display:flex; flex-direction:column; gap:14px; }
.item { border:1px solid #f0f0f0; border-radius: var(--radius); padding: 16px; background:#fff; box-shadow: var(--shadow-sm); }
.note { font-size: 15px; line-height: 1.9; white-space: pre-wrap; }
.ops { display:flex; gap:8px; margin-top:10px }
.meta { color: var(--muted); }
.dlg-field { display:flex; flex-direction:column; gap:8px }
.dlg-field input, .dlg-field textarea { width:100%; }
.err { color: var(--danger); }
</style>

