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
.mask { 
  position: fixed; 
  inset: 0; 
  background: rgba(0, 0, 0, 0.5); 
  backdrop-filter: blur(4px);
  display: flex; 
  align-items: center; 
  justify-content: center; 
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

.dlg { 
  width: min(520px, 90vw); 
  background: var(--card-bg); 
  border-radius: var(--radius);
  box-shadow: var(--shadow-xl); 
  overflow: hidden;
  border: 1px solid var(--border-light);
  animation: slideIn 0.3s ease-out;
  transform-origin: center;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

header { 
  padding: 20px 24px; 
  font-weight: 600; 
  font-size: var(--font-size-lg);
  color: var(--text);
  border-bottom: 1px solid var(--border-light);
  background: var(--gradient-card);
  display: flex;
  align-items: center;
  gap: 12px;
}

section { 
  padding: 24px; 
  color: var(--text);
  line-height: var(--line-height-relaxed);
}

footer { 
  display: flex; 
  gap: 12px; 
  justify-content: flex-end; 
  padding: 20px 24px; 
  border-top: 1px solid var(--border-light);
  background: var(--bg-solid);
}

button { 
  padding: 12px 20px; 
  border: 2px solid var(--border); 
  border-radius: var(--radius-sm); 
  background: #fff;
  color: var(--text);
  font-weight: 500;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
  border-color: var(--primary-300);
}

.primary { 
  background: var(--gradient-primary); 
  color: #fff; 
  border-color: var(--primary);
}

.primary:hover {
  background: var(--gradient-accent);
  border-color: var(--primary-600);
  box-shadow: var(--shadow-md);
}

/* Mobile Responsiveness */
@media (max-width: 480px) {
  .dlg {
    width: min(380px, 95vw);
  }
  
  header {
    padding: 16px 20px;
    font-size: var(--font-size-base);
  }
  
  section {
    padding: 20px;
  }
  
  footer {
    padding: 16px 20px;
    gap: 8px;
  }
  
  button {
    padding: 10px 16px;
    font-size: var(--font-size-xs);
    min-width: 70px;
  }
}
</style>


