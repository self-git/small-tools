<script setup lang="ts">
import { computed, h, nextTick, ref } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import type { JSONDataType } from 'vue-json-pretty/types/utils'
import 'vue-json-pretty/lib/styles.css'
import ToolLayout from '@/components/ToolLayout.vue'
import CopyButton from '@/components/CopyButton.vue'
import { smartParse } from '@/composables/useJsonParse'
import {
  diffJson,
  formatDiffReport,
  formatDiffValue,
  toTreePath,
  DIFF_KIND_LABELS,
  type CompareMode,
  type DiffEntry,
  type DiffKind,
} from '@/composables/useJsonDiff'

type ResultState = 'idle' | 'identical' | 'diff' | 'error'
type KindFilter = 'all' | DiffKind

const inputA = ref('')
const inputB = ref('')
const maxDepth = ref(10)
const compareMode = ref<CompareMode>('strict')
const errorA = ref('')
const errorB = ref('')
const resultState = ref<ResultState>('idle')
const jsonDataA = ref<JSONDataType | undefined>(undefined)
const jsonDataB = ref<JSONDataType | undefined>(undefined)
const diffEntries = ref<DiffEntry[]>([])
const selectedPath = ref('')
const kindFilter = ref<KindFilter>('all')
const locateActive = ref(false)
const treeWrapperA = ref<HTMLElement | null>(null)
const treeWrapperB = ref<HTMLElement | null>(null)

const canCompare = computed(() => inputA.value.trim() !== '' && inputB.value.trim() !== '')

const filteredEntries = computed(() => {
  if (kindFilter.value === 'all') return diffEntries.value
  return diffEntries.value.filter(e => e.kind === kindFilter.value)
})

const diffReportText = computed(() =>
  diffEntries.value.length ? formatDiffReport(diffEntries.value, compareMode.value) : '',
)

const treeDeep = computed(() => (locateActive.value ? 100 : 3))
const treeVirtual = computed(() => !locateActive.value)
const treeKey = computed(() => `${compareMode.value}-${selectedPath.value}-${diffEntries.value.length}`)

const kindFilterOptions: { value: KindFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'only_a', label: DIFF_KIND_LABELS.only_a },
  { value: 'only_b', label: DIFF_KIND_LABELS.only_b },
  { value: 'value', label: DIFF_KIND_LABELS.value },
  { value: 'type', label: DIFF_KIND_LABELS.type },
]

function shouldHighlight(side: 'a' | 'b', kind: DiffKind): boolean {
  if (kind === 'only_a') return side === 'a'
  if (kind === 'only_b') return side === 'b'
  return true
}

function makeRender(side: 'a' | 'b') {
  function wrap(
    defaultContent: string | ReturnType<typeof h>,
    nodePath: string,
  ): string | ReturnType<typeof h> {
    const entry = diffEntries.value.find(e => toTreePath(e.path) === nodePath)
    if (!entry || !shouldHighlight(side, entry.kind)) return defaultContent
    const isCurrent = selectedPath.value === entry.path
    return h(
      'span',
      {
        class: ['jcmp-diff', `jcmp-diff-${entry.kind}`, isCurrent && 'jcmp-diff-current'],
      },
      typeof defaultContent === 'string' ? defaultContent : defaultContent,
    )
  }

  return {
    renderNodeKey(opt: { node: { path: string }; defaultKey: string | ReturnType<typeof h> }) {
      return typeof opt.defaultKey === 'string'
        ? wrap(opt.defaultKey, opt.node.path)
        : opt.defaultKey
    },
    renderNodeValue(opt: { node: { path: string }; defaultValue: string | ReturnType<typeof h> }) {
      return typeof opt.defaultValue === 'string'
        ? wrap(opt.defaultValue, opt.node.path)
        : opt.defaultValue
    },
  }
}

const renderA = makeRender('a')
const renderB = makeRender('b')

function writeClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
    return
  }
  fallbackCopy(text)
}

function fallbackCopy(text: string) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

function onCompare() {
  errorA.value = ''
  errorB.value = ''
  selectedPath.value = ''
  locateActive.value = false

  if (!canCompare.value) {
    resultState.value = 'error'
    if (!inputA.value.trim()) errorA.value = 'JSON A 不能为空'
    if (!inputB.value.trim()) errorB.value = 'JSON B 不能为空'
    return
  }

  const resA = smartParse(inputA.value, maxDepth.value)
  const resB = smartParse(inputB.value, maxDepth.value)

  if (resA.error) {
    errorA.value = resA.error
    resultState.value = 'error'
    jsonDataA.value = undefined
    jsonDataB.value = undefined
    diffEntries.value = []
    return
  }
  if (resB.error) {
    errorB.value = resB.error
    resultState.value = 'error'
    jsonDataA.value = undefined
    jsonDataB.value = undefined
    diffEntries.value = []
    return
  }

  const entries = diffJson(resA.final, resB.final, compareMode.value)
  if (entries.length === 0) {
    resultState.value = 'identical'
    jsonDataA.value = undefined
    jsonDataB.value = undefined
    diffEntries.value = []
    return
  }

  resultState.value = 'diff'
  jsonDataA.value = JSON.parse(JSON.stringify(resA.final)) as JSONDataType
  jsonDataB.value = JSON.parse(JSON.stringify(resB.final)) as JSONDataType
  diffEntries.value = entries
}

function clearA() {
  inputA.value = ''
  errorA.value = ''
}

function clearB() {
  inputB.value = ''
  errorB.value = ''
}

function onCompareKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    onCompare()
  }
}

async function selectDiff(entry: DiffEntry) {
  selectedPath.value = entry.path
  locateActive.value = true
  await nextTick()
  treeWrapperA.value?.querySelector('.jcmp-diff-current')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  treeWrapperB.value?.querySelector('.jcmp-diff-current')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function entrySummary(entry: DiffEntry): string {
  if (entry.kind === 'only_a') return formatDiffValue(entry.valueA)
  if (entry.kind === 'only_b') return formatDiffValue(entry.valueB)
  if (entry.kind === 'type') {
    const ta = entry.valueA === null ? 'null' : Array.isArray(entry.valueA) ? 'array' : typeof entry.valueA
    const tb = entry.valueB === null ? 'null' : Array.isArray(entry.valueB) ? 'array' : typeof entry.valueB
    return `${ta} → ${tb}`
  }
  return `${formatDiffValue(entry.valueA)} → ${formatDiffValue(entry.valueB)}`
}

function kindBadgeClass(kind: DiffKind): string {
  const map: Record<DiffKind, string> = {
    only_a: 'bg-(--color-danger-bg) text-(--color-danger-text)',
    only_b: 'bg-(--color-primary)/10 text-(--color-primary)',
    value: 'bg-(--color-warn-bg) text-(--color-warn-text)',
    type: 'bg-(--color-warn-bg) text-(--color-warn-text)',
  }
  return map[kind]
}
</script>

<template>
  <ToolLayout
    title="JSON 对比"
    desc="粘贴两份 JSON，找出结构或取值的差异；支持严格 / 宽松比较规则"
  >
  <div class="space-y-4" @keydown="onCompareKeydown">
    <!-- 工具栏 -->
    <div class="flex flex-wrap items-center gap-3">
      <button
        @click="onCompare"
        :disabled="!canCompare"
        class="px-5 py-2 text-sm sm:text-base rounded-lg bg-(--color-primary) text-white hover:bg-(--color-primary-hover) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        对比 (⌘+Enter)
      </button>
      <div class="flex items-center gap-2 text-sm text-(--color-text-secondary)">
        <label>最大深度：</label>
        <input
          v-model.number="maxDepth"
          type="number"
          min="1"
          max="50"
          class="w-16 px-2 py-1 rounded-md border border-(--color-border) bg-(--color-surface) text-center"
        />
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span class="text-(--color-text-secondary)">比较规则：</span>
        <label class="inline-flex items-center gap-1 cursor-pointer">
          <input v-model="compareMode" type="radio" value="strict" class="accent-(--color-primary)" />
          严格
        </label>
        <label class="inline-flex items-center gap-1 cursor-pointer">
          <input v-model="compareMode" type="radio" value="loose" class="accent-(--color-primary)" />
          宽松
        </label>
      </div>
    </div>

    <!-- 双输入 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-base font-semibold text-(--color-text)">JSON A</label>
          <button
            @click="clearA"
            class="text-sm px-3 py-1.5 rounded-md text-(--color-text-secondary) hover:text-(--color-danger-text) border border-(--color-border) hover:border-(--color-danger-border) transition-colors"
          >
            清空
          </button>
        </div>
        <textarea
          v-model="inputA"
          placeholder="粘贴 JSON A..."
          class="w-full h-56 px-4 py-3 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm sm:text-base font-mono resize-y focus:outline-none focus:border-(--color-primary) transition-colors"
        />
        <div
          v-if="errorA"
          class="p-3 rounded-lg border text-sm"
          style="background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger-text);"
        >
          {{ errorA }}
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-base font-semibold text-(--color-text)">JSON B</label>
          <button
            @click="clearB"
            class="text-sm px-3 py-1.5 rounded-md text-(--color-text-secondary) hover:text-(--color-danger-text) border border-(--color-border) hover:border-(--color-danger-border) transition-colors"
          >
            清空
          </button>
        </div>
        <textarea
          v-model="inputB"
          placeholder="粘贴 JSON B..."
          class="w-full h-56 px-4 py-3 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm sm:text-base font-mono resize-y focus:outline-none focus:border-(--color-primary) transition-colors"
        />
        <div
          v-if="errorB"
          class="p-3 rounded-lg border text-sm"
          style="background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger-text);"
        >
          {{ errorB }}
        </div>
      </div>
    </div>

    <!-- 结果区 -->
    <div class="rounded-xl border border-(--color-border) bg-(--color-surface) p-4 sm:p-5 min-h-32">
      <div
        v-if="resultState === 'idle'"
        class="flex flex-col items-center justify-center py-10 text-(--color-text-secondary) text-sm sm:text-base"
      >
        <span class="text-3xl mb-2">⚖️</span>
        填写 JSON A / B 后点击「对比」查看差异
      </div>

      <div
        v-else-if="resultState === 'identical'"
        class="flex flex-col items-center justify-center py-10 text-sm sm:text-base"
        style="color: var(--color-primary);"
      >
        <span class="text-3xl mb-2">✓</span>
        两份 JSON 完全相同
      </div>

      <template v-else-if="resultState === 'diff'">
        <!-- 差异列表 -->
        <div class="space-y-3 mb-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-base font-semibold text-(--color-text)">
              差异列表
              <span class="ml-2 text-sm font-normal text-(--color-text-secondary)">
                共 {{ diffEntries.length }} 处
              </span>
            </h3>
            <CopyButton v-if="diffReportText" :text="diffReportText" label="复制完整报告" />
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in kindFilterOptions"
              :key="opt.value"
              @click="kindFilter = opt.value"
              class="px-3 py-1 text-xs sm:text-sm rounded-full border transition-colors"
              :class="kindFilter === opt.value
                ? 'border-(--color-primary) bg-(--color-primary)/10 text-(--color-primary)'
                : 'border-(--color-border) text-(--color-text-secondary) hover:border-(--color-primary)'"
            >
              {{ opt.label }}
            </button>
          </div>

          <div
            v-if="filteredEntries.length === 0"
            class="text-sm text-(--color-text-secondary) py-4 text-center"
          >
            当前筛选下无差异项
          </div>

          <ul v-else class="space-y-2 max-h-64 overflow-auto">
            <li
              v-for="(entry, idx) in filteredEntries"
              :key="`${entry.path}-${entry.kind}-${idx}`"
              @click="selectDiff(entry)"
              class="group flex flex-wrap items-start gap-2 p-3 rounded-lg border border-(--color-border) cursor-pointer hover:border-(--color-primary) transition-colors"
              :class="selectedPath === entry.path ? 'border-(--color-primary) bg-(--color-primary)/5' : 'bg-(--color-bg)'"
            >
              <span
                class="shrink-0 px-2 py-0.5 text-xs rounded-md font-medium"
                :class="kindBadgeClass(entry.kind)"
              >
                {{ DIFF_KIND_LABELS[entry.kind] }}
              </span>
              <code class="flex-1 min-w-0 text-sm font-mono break-all text-(--color-text)">{{ entry.path }}</code>
              <span class="w-full text-xs sm:text-sm text-(--color-text-secondary) font-mono break-all pl-0 sm:pl-1">
                {{ entrySummary(entry) }}
              </span>
              <button
                @click.stop="writeClipboard(entry.path)"
                class="shrink-0 text-xs px-2 py-1 rounded border border-(--color-border) text-(--color-text-secondary) opacity-0 group-hover:opacity-100 hover:text-(--color-primary) hover:border-(--color-primary) transition-all"
                title="复制路径"
              >
                复制路径
              </button>
            </li>
          </ul>
        </div>

        <!-- 双树 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 class="text-base font-semibold text-(--color-text) mb-2">JSON A 结构</h3>
            <div
              ref="treeWrapperA"
              class="p-3 rounded-lg border border-(--color-border) bg-(--color-bg) max-h-[380px] overflow-auto"
            >
              <VueJsonPretty
                :key="`a-${treeKey}`"
                :data="jsonDataA"
                :deep="treeDeep"
                :show-double-quotes="true"
                :show-length="true"
                :show-line="false"
                :show-icon="true"
                :collapsed-on-click-brackets="true"
                :virtual="treeVirtual"
                :height="380"
                :item-height="22"
                :render-node-key="renderA.renderNodeKey"
                :render-node-value="renderA.renderNodeValue"
              />
            </div>
          </div>
          <div>
            <h3 class="text-base font-semibold text-(--color-text) mb-2">JSON B 结构</h3>
            <div
              ref="treeWrapperB"
              class="p-3 rounded-lg border border-(--color-border) bg-(--color-bg) max-h-[380px] overflow-auto"
            >
              <VueJsonPretty
                :key="`b-${treeKey}`"
                :data="jsonDataB"
                :deep="treeDeep"
                :show-double-quotes="true"
                :show-length="true"
                :show-line="false"
                :show-icon="true"
                :collapsed-on-click-brackets="true"
                :virtual="treeVirtual"
                :height="380"
                :item-height="22"
                :render-node-key="renderB.renderNodeKey"
                :render-node-value="renderB.renderNodeValue"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
  </ToolLayout>
</template>

<style>
.jcmp-diff {
  border-radius: 2px;
  padding: 0 1px;
}
.jcmp-diff-only_a {
  background: var(--color-danger-bg);
  color: var(--color-danger-text);
}
.jcmp-diff-only_b {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}
.jcmp-diff-value,
.jcmp-diff-type {
  background: var(--color-warn-bg);
  color: var(--color-warn-text);
}
.jcmp-diff-current {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
</style>
