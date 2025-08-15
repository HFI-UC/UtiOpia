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
.toast-wrap { 
  position: fixed; 
  top: 80px; 
  right: 24px; 
  display: flex; 
  flex-direction: column; 
  gap: 12px; 
  z-index: 9999;
  max-width: 400px;
}

.toast { 
  padding: 16px 20px; 
  border-radius: var(--radius-sm); 
  color: #fff; 
  box-shadow: var(--shadow-lg);
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: var(--line-height-normal);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;
  max-width: 100%;
  word-wrap: break-word;
}

.toast::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
}

.toast.info { 
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
}

.toast.success { 
  background: linear-gradient(135deg, var(--success) 0%, var(--success-light) 100%);
}

.toast.error { 
  background: linear-gradient(135deg, var(--danger) 0%, var(--danger-light) 100%);
}

.fade-enter-active, .fade-leave-active { 
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.8);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.8);
}

.fade-enter-to, .fade-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .toast-wrap {
    top: 80px;
    right: 16px;
    left: 16px;
    max-width: none;
  }
  
  .toast {
    padding: 14px 16px;
    font-size: var(--font-size-xs);
  }
  
  .fade-enter-from, .fade-leave-to {
    transform: translateY(-20px) scale(0.8);
  }
  
  .fade-enter-to, .fade-leave-from {
    transform: translateY(0) scale(1);
  }
}
</style>


