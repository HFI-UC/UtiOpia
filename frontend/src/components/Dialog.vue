<template>
  <div v-if="open" class="mask" @click.self="emit('close')">
    <div class="dlg">
      <header><slot name="title">提示</slot></header>
      <section><slot /></section>
      <footer>
        <button @click="emit('close')">取消</button>
        <button class="primary" @click="emit('confirm')">确定</button>
      </footer>
    </div>
  </div>
  </template>

<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm'): void }>()
</script>

<style scoped>
.mask { position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; }
.dlg { width: min(520px, 90vw); background:#fff; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.2); overflow:hidden; }
header { padding:12px 16px; font-weight:600; border-bottom:1px solid #eee; }
section { padding:16px; }
footer { display:flex; gap:8px; justify-content:flex-end; padding:12px 16px; border-top:1px solid #eee; }
.primary { background:#2f54eb; color:#fff; }
button { padding:8px 12px; border:1px solid #ddd; border-radius:6px; background:#fff; }
</style>


