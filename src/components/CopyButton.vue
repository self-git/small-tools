<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  text: string
  label?: string
}>()

const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = props.text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  }
}
</script>

<template>
  <button
    @click="copy"
    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all duration-200"
    :class="copied
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'"
  >
    <span v-if="copied">✓ 已复制</span>
    <span v-else>{{ label || '复制' }}</span>
  </button>
</template>
