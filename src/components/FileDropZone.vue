<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  accept: string
  enablePaste?: boolean
}>(), {
  enablePaste: true,
})

const emit = defineEmits<{
  file: [file: File]
}>()

const isDragOver = ref(false)
const inputRef = ref<HTMLInputElement>()
const pasteTip = ref('')
const pasteStatus = ref<'success' | 'error' | null>(null)
let pasteTipTimer: number | null = null

function clearPasteTipTimer() {
  if (pasteTipTimer !== null) {
    window.clearTimeout(pasteTipTimer)
    pasteTipTimer = null
  }
}

function showPasteTip(message: string, status: 'success' | 'error') {
  pasteTip.value = message
  pasteStatus.value = status
  clearPasteTipTimer()
  pasteTipTimer = window.setTimeout(() => {
    pasteTip.value = ''
    pasteStatus.value = null
  }, 2000)
}

function getPastedImageFile(e: ClipboardEvent): File | null {
  const items = e.clipboardData?.items
  if (!items?.length) return null

  for (const item of items) {
    if (!item.type.startsWith('image/')) continue
    const blob = item.getAsFile()
    if (!blob) continue
    const ext = blob.type.split('/')[1] || 'png'
    return new File([blob], `clipboard-image.${ext}`, { type: blob.type })
  }

  return null
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) emit('file', file)
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    emit('file', file)
    if (inputRef.value) inputRef.value.value = ''
  }
}

function onPaste(e: ClipboardEvent) {
  if (!props.enablePaste) return
  const file = getPastedImageFile(e)
  if (file) {
    e.preventDefault()
    emit('file', file)
    showPasteTip('已从剪贴板读取图片', 'success')
    return
  }
  showPasteTip('剪贴板中未检测到图片', 'error')
}

/** 组件显示期间监听全局粘贴，确保截图后可直接上传 */
onMounted(() => {
  if (props.enablePaste) window.addEventListener('paste', onPaste)
})

onBeforeUnmount(() => {
  window.removeEventListener('paste', onPaste)
  clearPasteTipTimer()
})
</script>

<template>
  <div
    @dragover.prevent="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop.prevent="onDrop"
    @paste="onPaste"
    @click="inputRef?.click()"
    tabindex="0"
    class="relative border-2 border-dashed rounded-xl p-7 sm:p-8 text-center cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-(--color-primary)/30"
    :class="isDragOver
      ? 'border-(--color-primary) bg-(--color-primary)/5'
      : 'border-(--color-border) hover:border-(--color-primary) hover:bg-(--color-primary)/5'"
  >
    <input
      ref="inputRef"
      type="file"
      :accept="props.accept"
      class="hidden"
      @change="onFileChange"
    />
    <div class="text-4xl mb-2">📁</div>
    <p class="text-(--color-text-secondary) text-sm sm:text-base">
      拖拽文件到此处，或 <span class="text-(--color-primary) font-medium">点击上传</span>，支持 <span class="font-medium">⌘V / Ctrl+V</span> 粘贴图片
    </p>
    <p
      v-if="pasteTip"
      class="mt-2 text-sm"
      :class="pasteStatus === 'success' ? 'text-(--color-success-muted)' : 'text-(--color-warn-text)'"
    >
      {{ pasteTip }}
    </p>
    <slot />
  </div>
</template>
