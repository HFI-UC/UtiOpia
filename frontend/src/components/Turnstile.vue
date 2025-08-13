<template>
  <div class="cf-turnstile" :data-sitekey="siteKey" :data-callback="callbackName"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{ siteKey?: string; callbackName?: string }>()
const emit = defineEmits<{ (e: 'verified', token: string): void }>()

const siteKey = props.siteKey || (import.meta.env.VITE_TURNSTILE_SITE_KEY as string)
const cbName = props.callbackName || `utiopiaTs_${Math.random().toString(36).slice(2)}`
const callbackName = cbName

onMounted(() => {
  ;(window as any)[callbackName] = (token: string) => emit('verified', token)
})
onBeforeUnmount(() => {
  delete (window as any)[callbackName]
})
</script>


