<template>
  <div class="toast-wrap">
    <transition-group name="fade" tag="div">
      <div class="toast" v-for="t in list" :key="t.id" :class="t.type">{{ t.text }}</div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

type ToastItem = { id:number; text:string; type:'info'|'success'|'error' }
const list = reactive<ToastItem[]>([])
let autoId = 1

function push(text:string, type:ToastItem['type']='info', ms=2500) {
  const id = autoId++
  list.push({ id, text, type })
  setTimeout(() => {
    const i = list.findIndex(x => x.id === id)
    if (i >= 0) list.splice(i, 1)
  }, ms)
}

defineExpose({ push })
</script>

<style scoped>
.toast-wrap { position: fixed; top: 20px; right: 20px; display:flex; flex-direction:column; gap:8px; z-index: 9999; }
.toast { padding:10px 14px; border-radius:8px; color:#fff; box-shadow:0 10px 20px rgba(0,0,0,.12) }
.toast.info { background:#2f54eb }
.toast.success { background:#52c41a }
.toast.error { background:#ff4d4f }
.fade-enter-active,.fade-leave-active { transition: opacity .2s }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>


