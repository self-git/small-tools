<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import ToolLayout from '@/components/ToolLayout.vue'
import CopyButton from '@/components/CopyButton.vue'
import {
  useSseWorkflowPreview,
  type WorkflowStep,
} from '@/composables/useSseWorkflowPreview'

/** 工作流 SSE 文本 + 聚合后的 steps；reset 清空 */
const { raw, result, reset } = useSseWorkflowPreview()

/** 复制时把每个步骤的对外正文（aiDialog 用 aiResponse / streamText）拼成一段 */
const mergedForCopy = computed(() =>
  result.value.steps
    .map((s) => {
      const title = `[${s.name || s.sourceTypeName || 'Step'}]`
      if (s.sourceTypeName === 'aiDialog') return `${title}\n${getAiDisplayText(s)}`
      if (s.sourceTypeName === 'start') return `${title} 工作流${s.status === 'completed' ? '已完成' : '进行中'}`
      return `${title}\n${safeStringify(s.completedPayload ?? s.startedPayload)}`
    })
    .join('\n\n'),
)

/** 缩减示例：start + codeExecution + aiDialog（Started / 多帧 Output / Completed），外层 SuperStep 由解析器自动跳过 */
const EXAMPLE_SSE = `id: 0
event: Message
data: {"id":"a1","name":"SuperStep","sourceId":null,"sourceTypeName":"","role":"SuperStep","result":null,"resultType":"json","actionType":"Started"}

id: 1
event: Message
data: {"id":"b1","name":"开始","sourceId":"1","sourceTypeName":"start","role":"Executor","result":"{}","resultType":"json","actionType":"Started"}

id: 2
event: Message
data: {"id":"b2","name":"开始","sourceId":"1","sourceTypeName":"start","role":"Executor","result":"{}","resultType":"json","actionType":"Completed"}

id: 3
event: Message
data: {"id":"c1","name":"代码执行","sourceId":"3","sourceTypeName":"codeExecution","role":"Executor","result":"{\\"customInputs\\":{\\"data\\":[{\\"role\\":\\"user\\",\\"text\\":\\"详细介绍 3AE8-12-0B\\"}]},\\"language\\":\\"javascript\\",\\"code\\":\\"function main({data}){\\\\n  return { result: data.slice(-10) }\\\\n}\\",\\"customOutputs\\":{\\"result\\":\\"arrayAny\\"}}","resultType":"json","actionType":"Started"}

id: 4
event: Message
data: {"id":"c2","name":"代码执行","sourceId":"3","sourceTypeName":"codeExecution","role":"Executor","result":"{\\"result\\":[{\\"role\\":\\"user\\",\\"text\\":\\"详细介绍 3AE8-12-0B\\"}]}","resultType":"json","actionType":"Completed"}

id: 5
event: Message
data: {"id":"d1","name":"AI对话","sourceId":"2","sourceTypeName":"aiDialog","role":"Executor","result":"{\\"model\\":\\"gpt-4\\",\\"systemPrompt\\":\\"你是电器物料选型助手，只做务实、可落地的规格书解读。\\",\\"userPrompt\\":\\"输出该电压等级的全参数表\\",\\"isStream\\":true}","resultType":"json","actionType":"Started"}

id: 6
event: Message
data: {"id":"d2","name":"AI对话","sourceId":"2","sourceTypeName":"aiDialog","role":"Executor","result":"请明确","resultType":"string","actionType":"Output"}

id: 7
event: Message
data: {"id":"d3","name":"AI对话","sourceId":"2","sourceTypeName":"aiDialog","role":"Executor","result":"你要的","resultType":"string","actionType":"Output"}

id: 8
event: Message
data: {"id":"d4","name":"AI对话","sourceId":"2","sourceTypeName":"aiDialog","role":"Executor","result":"**具体电压等级**，例如：\\n- 10kV 交流真空断路器\\n- 35kV 氧化锌避雷器\\n\\n示例代码：\\n\`\`\`js\\nconst v = 10_000; // 10kV\\n\`\`\`\\n","resultType":"string","actionType":"Output"}

id: 9
event: Message
data: {"id":"d5","name":"AI对话","sourceId":"2","sourceTypeName":"aiDialog","role":"Executor","result":"{\\"aiResponse\\":\\"请明确你要的**具体电压等级**，例如：\\\\n- 10kV 交流真空断路器\\\\n- 35kV 氧化锌避雷器\\\\n\\\\n示例代码：\\\\n\`\`\`js\\\\nconst v = 10_000; // 10kV\\\\n\`\`\`\\\\n\\",\\"_systemErrorText\\":null}","resultType":"json","actionType":"Completed"}

id: 10
event: Message
data: [DONE]`

const previewScrollRef = ref<HTMLElement | null>(null)

function loadExample() {
  raw.value = EXAMPLE_SSE
}

function onReset() {
  reset()
}

/** 粘贴后保证 v-model 已是完整文本再滚动到底（与 ChatPreview 对齐） */
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

/** 按节点类型给头像色 + 图标（近似 ChatListV2 iconInfo 方案：icon + iconBg + iconColor） */
type AvatarInfo = { label: string; bg: string; fg: string }
function getAvatarInfo(step: WorkflowStep): AvatarInfo {
  switch (step.sourceTypeName) {
    case 'start':
      return { label: '▶', bg: '#d6e4dc', fg: '#3a5446' }
    case 'codeExecution':
      return { label: '</>', bg: '#e3dce8', fg: '#5a4a6e' }
    case 'aiDialog':
      return { label: 'AI', bg: '#dce4ef', fg: '#495a6e' }
    default:
      return { label: '●', bg: '#e8eaef', fg: '#6b7285' }
  }
}

/** aiDialog 展示文本：已完成优先取 Completed.aiResponse，否则用流式累积文本 */
function getAiDisplayText(step: WorkflowStep): string {
  if (step.status === 'completed' && isRecord(step.completedPayload)) {
    const resp = step.completedPayload.aiResponse
    if (typeof resp === 'string' && resp) return resp
  }
  return step.streamText
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** VueJsonPretty 要求 JSONDataType，这里仅在模板侧做一次桥接，不污染 composable 的 unknown 泛型 */
type JsonLike = string | number | boolean | null | JsonLike[] | { [k: string]: JsonLike }
function asJson(v: unknown): JsonLike {
  return v as JsonLike
}

function safeStringify(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

/** 按 ``` 围栏把文本切成文本段和代码段，简化替代 markstream-vue；避免引新依赖 */
type TextSegment = { type: 'text'; content: string } | { type: 'code'; lang: string; content: string }
function splitByCodeFence(text: string): TextSegment[] {
  if (!text) return []
  const segments: TextSegment[] = []
  const fenceRe = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = fenceRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'code', lang: match[1] || '', content: match[2] ?? '' })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) })
  }
  return segments
}

/** 控制 codeExecution 的输入/输出折叠态（每个步骤独立） */
const expandedSteps = ref<Set<string>>(new Set())
function toggleStep(id: string) {
  const next = new Set(expandedSteps.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedSteps.value = next
}
function isExpanded(id: string): boolean {
  return expandedSteps.value.has(id)
}
</script>

<template>
  <ToolLayout
    title="工作流解析"
    desc="粘贴工作流 SSE 日志，按 sourceId 聚合成节点气泡：SuperStep 自动忽略；aiDialog 的 Output 片段自动拼接为流式回复"
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
          placeholder="粘贴包含 id / event: Message / data: {id,name,sourceId,sourceTypeName,actionType,...} 的完整日志..."
          class="w-full h-72 px-4 py-3 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm sm:text-base font-mono resize-y focus:outline-none focus:border-(--color-primary) transition-colors"
          @paste="onInputPaste"
          @input="scrollPreviewBottom"
        />

        <p class="text-xs sm:text-sm text-(--color-text-secondary)">
          已解析 Message：{{ result.stats.messageParsed }} 条 · 非 Message 块：{{ result.stats.skippedNonMessage }} ·
          SuperStep 跳过：{{ result.stats.superStepSkipped }} · [DONE]：{{ result.stats.doneMarkers }} ·
          节点气泡：{{ result.steps.length }}
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
            v-if="result.steps.length"
            :text="mergedForCopy"
            label="复制合并正文"
          />
        </div>

        <div
          ref="previewScrollRef"
          class="min-h-72 max-h-[36rem] overflow-y-auto rounded-xl border border-(--color-border) bg-(--color-bg) px-3 py-4 flex flex-col gap-4"
        >
          <div
            v-if="!result.steps.length"
            class="flex flex-col items-center justify-center min-h-56 text-(--color-text-secondary) text-sm sm:text-base"
          >
            <span class="text-3xl mb-2">🧭</span>
            左侧粘贴工作流 SSE 后在此按节点分组渲染；未结束节点展示 loading 气泡
          </div>

          <!-- 单条节点气泡：左侧头像 + 下方节点名；右侧内容区（状态 + 气泡体） -->
          <div
            v-for="step in result.steps"
            :key="step.stepId"
            class="flex items-start gap-3"
          >
            <div class="flex flex-col items-center shrink-0 w-12">
              <div class="relative">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold select-none"
                  :style="{ background: getAvatarInfo(step).bg, color: getAvatarInfo(step).fg }"
                >
                  {{ getAvatarInfo(step).label }}
                </div>
                <span
                  v-if="step.status === 'running'"
                  class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-(--color-bg) bg-(--color-primary) animate-pulse"
                  title="执行中"
                />
              </div>
              <span class="mt-1 text-[11px] leading-tight text-(--color-text-secondary) text-center break-all">
                {{ step.name || step.sourceTypeName }}
              </span>
            </div>

            <div class="flex flex-col gap-1 min-w-0 flex-1">
              <div class="flex items-center gap-2 text-xs text-(--color-text-secondary) px-1">
                <span>#{{ step.stepId }}</span>
                <span class="opacity-60">·</span>
                <span>{{ step.sourceTypeName || 'unknown' }}</span>
                <span
                  class="ml-auto px-2 py-0.5 rounded-md border text-[11px]"
                  :style="
                    step.status === 'completed'
                      ? 'background: var(--color-success-bg); color: var(--color-success-text); border-color: transparent;'
                      : 'background: var(--color-warn-bg); color: var(--color-warn-text); border-color: var(--color-warn-border);'
                  "
                >
                  {{ step.status === 'completed' ? '已完成' : '执行中' }}
                </span>
              </div>

              <!-- 气泡体：按节点类型分支 -->
              <div
                class="max-w-full rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3 shadow-sm text-sm sm:text-base leading-relaxed break-words"
              >
                <!-- start 节点：极简状态 -->
                <template v-if="step.sourceTypeName === 'start'">
                  <div class="text-(--color-text-secondary)">
                    工作流{{ step.status === 'completed' ? '已启动并结束当前 SuperStep' : '启动中…' }}
                  </div>
                </template>

                <!-- codeExecution 节点：折叠展示 inputs / outputs -->
                <template v-else-if="step.sourceTypeName === 'codeExecution'">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-medium text-(--color-text)">代码执行</span>
                    <button
                      type="button"
                      class="text-xs px-2 py-0.5 rounded border border-(--color-border) text-(--color-text-secondary) hover:text-(--color-primary) hover:border-(--color-primary) transition-colors"
                      @click="toggleStep(step.stepId)"
                    >
                      {{ isExpanded(step.stepId) ? '收起详情' : '展开详情' }}
                    </button>
                  </div>
                  <div v-if="isExpanded(step.stepId)" class="mt-3 space-y-3">
                    <div>
                      <div class="text-xs text-(--color-text-secondary) mb-1">输入 (Started)</div>
                      <div class="rounded-lg border border-(--color-border) bg-(--color-bg) p-2 overflow-auto">
                        <VueJsonPretty :data="asJson(step.startedPayload)" :deep="2" :show-length="true" />
                      </div>
                    </div>
                    <div>
                      <div class="text-xs text-(--color-text-secondary) mb-1">输出 (Completed)</div>
                      <div class="rounded-lg border border-(--color-border) bg-(--color-bg) p-2 overflow-auto">
                        <VueJsonPretty
                          v-if="step.completedPayload != null"
                          :data="asJson(step.completedPayload)"
                          :deep="2"
                          :show-length="true"
                        />
                        <span v-else class="text-xs text-(--color-text-secondary)">暂无输出</span>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- aiDialog 节点：Markdown-lite 文本 + 可展开 prompt -->
                <template v-else-if="step.sourceTypeName === 'aiDialog'">
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="font-medium text-(--color-text)">AI 对话</span>
                    <button
                      type="button"
                      class="text-xs px-2 py-0.5 rounded border border-(--color-border) text-(--color-text-secondary) hover:text-(--color-primary) hover:border-(--color-primary) transition-colors"
                      @click="toggleStep(step.stepId)"
                    >
                      {{ isExpanded(step.stepId) ? '隐藏 Prompt' : '查看 Prompt' }}
                    </button>
                  </div>

                  <div v-if="isExpanded(step.stepId)" class="mb-3 rounded-lg border border-(--color-border) bg-(--color-bg) p-2 overflow-auto">
                    <VueJsonPretty :data="asJson(step.startedPayload)" :deep="2" :show-length="true" />
                  </div>

                  <div class="flex flex-col gap-2">
                    <template
                      v-for="(seg, idx) in splitByCodeFence(getAiDisplayText(step))"
                      :key="idx"
                    >
                      <pre
                        v-if="seg.type === 'code'"
                        class="m-0 px-3 py-2 rounded-lg bg-(--color-bg) border border-(--color-border) text-[13px] font-mono overflow-auto"
                      ><code>{{ seg.content }}</code></pre>
                      <div v-else class="whitespace-pre-wrap text-(--color-text)">{{ seg.content }}</div>
                    </template>
                    <div
                      v-if="step.status === 'running'"
                      class="mt-1 flex items-center gap-1 text-(--color-text-secondary)"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.32s]" />
                      <span class="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.16s]" />
                      <span class="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
                    </div>
                  </div>
                </template>

                <!-- 其他未知节点：直接展示完成/启动 payload -->
                <template v-else>
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-medium text-(--color-text)">{{ step.name || '未知节点' }}</span>
                    <button
                      type="button"
                      class="text-xs px-2 py-0.5 rounded border border-(--color-border) text-(--color-text-secondary) hover:text-(--color-primary) hover:border-(--color-primary) transition-colors"
                      @click="toggleStep(step.stepId)"
                    >
                      {{ isExpanded(step.stepId) ? '收起详情' : '展开详情' }}
                    </button>
                  </div>
                  <div
                    v-if="isExpanded(step.stepId)"
                    class="mt-3 rounded-lg border border-(--color-border) bg-(--color-bg) p-2 overflow-auto"
                  >
                    <VueJsonPretty
                      :data="asJson(step.completedPayload ?? step.startedPayload)"
                      :deep="2"
                      :show-length="true"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>
