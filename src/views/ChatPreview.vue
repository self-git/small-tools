<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import ToolLayout from '@/components/ToolLayout.vue'
import CopyButton from '@/components/CopyButton.vue'
import { useSseChatPreview } from '@/composables/useSseChatPreview'

const { raw, result, reset } = useSseChatPreview()

/** 复制用：多气泡合并为纯文本 */
const mergedForCopy = computed(() =>
  result.value.bubbles.map((b) => `[${b.role}] ${b.text}`).join('\n\n'),
)

/** 示例：同 Role 多帧增量 Content，末尾 [DONE] */
const EXAMPLE_SSE = `id: 0
event: Message
data: {"id":null,"RelationId":null,"IsStream":false,"Role":"assistant","Name":null,"AnotherName":null,"Content":"","IsEnd":false,"BinaryContent":null,"ContentType":"text","FunctionCallsInfo":null,"FunctionResultInfo":null,"IsKnowledgeSearchPlugin":false,"SendTime":"2026-04-13T14:46:42.4145826+08:00","Sort":null,"Icon":null,"FileIdList":[],"Type":0,"IsShow":true}

id: 32
event: Message
data: {"id":null,"RelationId":null,"IsStream":false,"Role":"assistant","Name":null,"AnotherName":null,"Content":"你好","IsEnd":false,"BinaryContent":null,"ContentType":"text","FunctionCallsInfo":null,"FunctionResultInfo":null,"IsKnowledgeSearchPlugin":false,"SendTime":"2026-04-13T14:46:46.8278079+08:00","Sort":null,"Icon":null,"FileIdList":[],"Type":0,"IsShow":true}

id: 33
event: Message
data: {"id":null,"RelationId":null,"IsStream":false,"Role":"assistant","Name":null,"AnotherName":null,"Content":"！有什么问题或者","IsEnd":false,"BinaryContent":null,"ContentType":"text","FunctionCallsInfo":null,"FunctionResultInfo":null,"IsKnowledgeSearchPlugin":false,"SendTime":"2026-04-13T14:46:46.9413393+08:00","Sort":null,"Icon":null,"FileIdList":[],"Type":0,"IsShow":true}

id: 34
event: Message
data: {"id":null,"RelationId":null,"IsStream":false,"Role":"assistant","Name":null,"AnotherName":null,"Content":"需要帮助的吗？\\uD83D\\uDE0A","IsEnd":false,"BinaryContent":null,"ContentType":"text","FunctionCallsInfo":null,"FunctionResultInfo":null,"IsKnowledgeSearchPlugin":false,"SendTime":"2026-04-13T14:46:47.1027727+08:00","Sort":null,"Icon":null,"FileIdList":[],"Type":0,"IsShow":true}

id: 37
event: Message
data: [DONE]`

const previewScrollRef = ref<HTMLElement | null>(null)

function loadExample() {
  raw.value = EXAMPLE_SSE
}

function onReset() {
  reset()
}

/**
 * 粘贴后保证 v-model 已是完整文本再滚动到底（与 JSON 工具一致：有 text/plain 时合并选区）。
 */
function onInputPaste(e: ClipboardEvent) {
  const cd = e.clipboardData
  if (!cd) {
    nextTick(() => scrollPreviewBottom())
    return
  }
  const pasted = cd.getData('text/plain')
  if (pasted === '') {
    nextTick(() => scrollPreviewBottom())
    return
  }
  const ta = e.target as HTMLTextAreaElement | null
  if (!ta) {
    nextTick(() => scrollPreviewBottom())
    return
  }
  e.preventDefault()
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const cur = raw.value
  raw.value = cur.slice(0, start) + pasted + cur.slice(end)
  const caret = start + pasted.length
  nextTick(() => {
    ta.setSelectionRange(caret, caret)
    scrollPreviewBottom()
  })
}

function scrollPreviewBottom() {
  const el = previewScrollRef.value
  if (!el) return
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight
  })
}

function bubbleAlignClass(role: string) {
  const r = role.toLowerCase()
  if (r === 'user') return 'items-end self-end'
  return 'items-start self-start'
}

function bubbleSurfaceClass(role: string) {
  const r = role.toLowerCase()
  if (r === 'user') {
    return 'bg-(--color-primary) text-white border-(--color-primary)'
  }
  if (r === 'assistant') {
    return 'bg-(--color-surface) text-(--color-text) border-(--color-border)'
  }
  return 'bg-(--color-warn-bg) text-(--color-warn-text) border-(--color-warn-border)'
}
</script>

<template>
  <ToolLayout
    title="聊天预览"
    desc="粘贴 SSE 风格日志（event: Message + JSON data），按 Role 合并同气泡，按 IsShow 决定是否拼接 Content"
  >
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <div class="space-y-3">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <label class="text-base font-semibold text-(--color-text)">原始 SSE 文本</label>
          <div class="flex gap-2">
            <button
              type="button"
              class="text-sm px-3 py-1.5 rounded-md text-(--color-text-secondary) hover:text-(--color-primary) border border-(--color-border) hover:border-(--color-primary) transition-colors"
              @click="loadExample"
            >
              加载示例
            </button>
            <button
              type="button"
              class="text-sm px-3 py-1.5 rounded-md text-(--color-text-secondary) hover:text-(--color-danger-text) border border-(--color-border) hover:border-(--color-danger-border) transition-colors"
              @click="onReset"
            >
              清空
            </button>
          </div>
        </div>

        <textarea
          v-model="raw"
          placeholder="粘贴包含 id / event: Message / data: {...} 的完整日志..."
          class="w-full h-72 px-4 py-3 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm sm:text-base font-mono resize-y focus:outline-none focus:border-(--color-primary) transition-colors"
          @paste="onInputPaste"
          @input="scrollPreviewBottom"
        />

        <p class="text-xs sm:text-sm text-(--color-text-secondary)">
          已解析 Message：{{ result.stats.messageParsed }} 条 · 非 Message 块：{{ result.stats.skippedNonMessage }} ·
          [DONE]：{{ result.stats.doneMarkers }} · 气泡：{{ result.bubbles.length }}
        </p>

        <div
          v-if="result.errors.length"
          class="p-3 rounded-lg border text-sm"
          style="background: var(--color-warn-bg); border-color: var(--color-warn-border); color: var(--color-warn-text);"
        >
          <div class="font-medium mb-1">解析提示（{{ result.errors.length }}）</div>
          <ul class="list-disc pl-5 space-y-0.5">
            <li v-for="(err, i) in result.errors" :key="i">{{ err }}</li>
          </ul>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <h2 class="text-base font-semibold text-(--color-text)">预览</h2>
          <CopyButton
            v-if="result.bubbles.length"
            :text="mergedForCopy"
            label="复制合并正文"
          />
        </div>

        <div
          ref="previewScrollRef"
          class="min-h-72 max-h-[32rem] overflow-y-auto rounded-xl border border-(--color-border) bg-(--color-bg) px-3 py-4 flex flex-col gap-3"
        >
          <div
            v-if="!result.bubbles.length"
            class="flex flex-col items-center justify-center min-h-56 text-(--color-text-secondary) text-sm sm:text-base"
          >
            <span class="text-3xl mb-2">💬</span>
            左侧粘贴后可在此查看气泡；同 Role 连续帧会拼成一条流式回复
          </div>

          <div
            v-for="(bubble, idx) in result.bubbles"
            :key="idx"
            class="flex w-full flex-col gap-1"
            :class="bubbleAlignClass(bubble.role)"
          >
            <span class="text-xs text-(--color-text-secondary) px-1">{{ bubble.role }}</span>
            <div
              class="max-w-[min(100%,42rem)] rounded-2xl px-4 py-2.5 text-sm sm:text-base leading-relaxed border whitespace-pre-wrap break-words shadow-sm"
              :class="bubbleSurfaceClass(bubble.role)"
            >
              {{ bubble.text }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>
