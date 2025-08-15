<template>
  <div ref="el" class="cf-turnstile"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{ siteKey?: string; callbackName?: string }>()
const emit = defineEmits<{ (e: 'verified', token: string): void }>()

const siteKey = props.siteKey || (import.meta.env.VITE_TURNSTILE_SITE_KEY as string)
const callbackName = props.callbackName || `utiopiaTs_${Math.random().toString(36).slice(2)}`
const el = ref<HTMLElement | null>(null)
let widgetId: any = null
let intervalId: any = null

function renderWidget() {
  if (!el.value) return
  const ts = (window as any).turnstile
  if (!ts || typeof ts.render !== 'function') return
  try {
    widgetId = ts.render(el.value, {
      sitekey: siteKey,
      callback: (token: string) => emit('verified', token),
    })
  } catch {}
}

onMounted(() => {
  ;(window as any)[callbackName] = (token: string) => emit('verified', token)
  if ((window as any).turnstile?.render) {
    renderWidget()
  } else {
    intervalId = setInterval(() => {
      if ((window as any).turnstile?.render) {
        clearInterval(intervalId)
        intervalId = null
        renderWidget()
      }
    }, 120)
  }
})

onBeforeUnmount(() => {
  if (intervalId) clearInterval(intervalId)
  const ts = (window as any).turnstile
  if (widgetId && ts && typeof ts.remove === 'function') {
    try { ts.remove(widgetId) } catch {}
  }
  delete (window as any)[callbackName]
})
</script>


