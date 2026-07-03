<script setup lang="ts">
import { nextTick, ref, computed, watch, h } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import VueJsonPretty from 'vue-json-pretty'
import type { JSONDataType } from 'vue-json-pretty/types/utils'
import 'vue-json-pretty/lib/styles.css'
import ToolLayout from '@/components/ToolLayout.vue'
import CopyButton from '@/components/CopyButton.vue'
import { useJsonParse } from '@/composables/useJsonParse'
import { useJsonTreeSearch } from '@/composables/useJsonTreeSearch'

const {
  input, maxDepth, result, expandedLayers,
  parse, toggleLayer, reset,
} = useJsonParse()
const autoParseError = ref('')

/** 包裹结果树的滚动容器，供搜索定位查询命中节点 */
const treeWrapper = ref<HTMLElement | null>(null)
const {
  searchInput, matchCount, currentIndex, searchActive,
  treeKey, treeDeep, treeVirtual,
  onSearchKeydown, goNext, goPrev, clearSearch,
  renderNodeKey, renderNodeValue,
} = useJsonTreeSearch(treeWrapper)

/** 树的可编辑副本：从 result.final 深拷贝，行内删除只改这里，不回写 result / 输入框 */
const jsonData = ref<JSONDataType | undefined>(undefined)
/** 结果变化时重建可编辑副本并清空上一次搜索，避免命中状态错位 */
watch(
  result,
  () => {
    const final = result.value?.final
    jsonData.value = final === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(final)) as JSONDataType)
    clearSearch()
  },
  { immediate: true },
)

/** 复制 JSON 跟随可编辑副本，保证与树展示一致 */
const formattedTree = computed(() => {
  const d = jsonData.value
  if (d === undefined) return ''
  try {
    return JSON.stringify(d, null, 2)
  } catch {
    return String(d)
  }
})

/** 示例数据：双重 stringify */
const exampleData = JSON.stringify(JSON.stringify({ name: "测试", age: 20, tags: ["vue", "ts"], nested: JSON.stringify({ deep: true, items: [1, 2, 3] }) }))

function loadExample() {
  input.value = exampleData
  autoParseError.value = ''
  parse()
}

function onManualParse() {
  autoParseError.value = ''
  parse()
}

function onReset() {
  autoParseError.value = ''
  reset()
}

/**
 * 输入回退栈：paste 合并 / 加载示例 / 清空都是程序化赋值 input.value，
 * 会破坏 textarea 原生 undo，这里自建历史快照（最多 20 份），Cmd/Ctrl+Z 回退。
 */
const INPUT_HISTORY_LIMIT = 20
const inputHistory: string[] = []
let suppressHistory = false
let lastSnapshotAt = 0

/** input 每次变化把旧值入栈；500ms 内的连续敲字合并为一个快照，避免逐字符占满 20 份 */
watch(input, (_nv, ov) => {
  if (suppressHistory) {
    suppressHistory = false
    return
  }
  const now = Date.now()
  if (now - lastSnapshotAt < 500) return
  lastSnapshotAt = now
  inputHistory.push(ov)
  if (inputHistory.length > INPUT_HISTORY_LIMIT) inputHistory.shift()
})

/** Cmd/Ctrl+Z：弹出上一份快照并重新解析，保证右侧结果与输入一致（空输入 parse 会清空结果） */
function undoInput() {
  const prev = inputHistory.pop()
  if (prev === undefined) return
  suppressHistory = true
  input.value = prev
  nextTick(() => {
    parse()
    syncAutoParseError()
  })
}

/** 粘贴后同步解析结果与输入区错误提示 */
function syncAutoParseError() {
  autoParseError.value = result.value?.error
    ? `自动解析失败：${result.value.error}`
    : ''
}

/**
 * paste 事件在浏览器把文本写入 textarea 之前触发，单靠 nextTick 时 v-model 仍是旧值。
 * 有 text/plain 时自行合并并 preventDefault，保证解析用的是完整新内容（Chrome / macOS 一致）。
 */
function onInputPaste(e: ClipboardEvent) {
  const cd = e.clipboardData
  if (!cd) {
    scheduleParseAfterNativePaste()
    return
  }
  const pasted = cd.getData('text/plain')
  if (pasted === '') {
    scheduleParseAfterNativePaste()
    return
  }
  const ta = e.target as HTMLTextAreaElement | null
  if (!ta) {
    scheduleParseAfterNativePaste()
    return
  }
  e.preventDefault()
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const cur = input.value
  input.value = cur.slice(0, start) + pasted + cur.slice(end)
  const caret = start + pasted.length
  nextTick(() => {
    ta.setSelectionRange(caret, caret)
    parse()
    syncAutoParseError()
  })
}

/** 无 text/plain 等场景：等浏览器默认插入完成后再解析 */
function scheduleParseAfterNativePaste() {
  requestAnimationFrame(() => {
    nextTick(() => {
      parse()
      syncAutoParseError()
    })
  })
}

/** 可展开节点（对象/数组）复用内置 copy 复制整段子数据；叶子节点复制 kv */
const EXPANDABLE_NODE_TYPES = new Set(['objectStart', 'arrayStart', 'objectCollapsed', 'arrayCollapsed'])

/** 写剪贴板：优先 navigator.clipboard，非安全上下文回退 execCommand（与 CopyButton 一致） */
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

/** 叶子节点复制 "key":value（去除尾部标点）；数组元素无 key 时仅复制值 */
function copyKv(node: { key?: string; content: unknown }) {
  const kv =
    node.key != null
      ? `${JSON.stringify(node.key)}:${JSON.stringify(node.content)}`
      : JSON.stringify(node.content)
  writeClipboard(kv)
}

/** 解析 vue-json-pretty 节点 path（rootPath 固定 'root'，形如 root.a["中文"][0]）为键序列 */
function parseNodePath(path: string): (string | number)[] {
  const rel = path.slice('root'.length)
  const keys: (string | number)[] = []
  const re = /\.([^.[\]]+)|\["([^"]*)"\]|\[(\d+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(rel)) !== null) {
    if (m[1] !== undefined) keys.push(m[1])
    else if (m[2] !== undefined) keys.push(m[2])
    else if (m[3] !== undefined) keys.push(Number(m[3]))
  }
  return keys
}

/** 按节点 path 定位父容器并从可编辑副本移除该项：数组用 splice，对象用 delete */
function deleteNode(node: { path: string }) {
  const keys = parseNodePath(node.path)
  if (keys.length === 0) return
  let parent: unknown = jsonData.value
  for (let i = 0; i < keys.length - 1; i++) {
    if (parent === null || typeof parent !== 'object') return
    parent = (parent as Record<string, unknown>)[keys[i] as string]
  }
  if (parent === null || typeof parent !== 'object') return
  const last = keys[keys.length - 1]
  if (Array.isArray(parent) && typeof last === 'number') parent.splice(last, 1)
  else delete (parent as Record<string, unknown>)[last as string]
}

function renderNodeActions(opt: {
  node: { type: string; key?: string; content: unknown; path: string }
  defaultActions: { copy: () => void }
}) {
  const expandable = EXPANDABLE_NODE_TYPES.has(opt.node.type)
  const copyBtn = h(
    'span',
    {
      class: 'jsp-copy-action',
      title: expandable ? '复制此节点' : '复制键值对',
      onClick: (e: MouseEvent) => {
        e.stopPropagation()
        if (expandable) opt.defaultActions.copy()
        else copyKv(opt.node)
      },
    },
    expandable ? '复制' : '复制kv',
  )
  // 根节点（path 为 rootPath 'root'）不提供删除，避免清空整棵树
  if (opt.node.path === 'root') return [copyBtn]
  const deleteBtn = h(
    'span',
    {
      class: 'jsp-delete-action',
      title: '删除此项',
      onClick: (e: MouseEvent) => {
        e.stopPropagation()
        deleteNode(opt.node)
      },
    },
    h(Delete),
  )
  return [copyBtn, deleteBtn]
}

function formatLayerOutput(output: unknown): string {
  if (typeof output === 'string') return output
  try {
    return JSON.stringify(output, null, 2)
  } catch {
    return String(output)
  }
}
</script>

<template>
  <ToolLayout title="JSON.stringify 智能解析器" desc="自动检测并递归解析多层 JSON.stringify 的数据，深度遍历嵌套字段">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <!-- 左侧：输入区 -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-base font-semibold text-(--color-text)">输入 JSON</label>
          <div class="flex gap-2">
            <button
              @click="loadExample"
              class="text-sm px-3 py-1.5 rounded-md text-(--color-text-secondary) hover:text-(--color-primary) border border-(--color-border) hover:border-(--color-primary) transition-colors"
            >
              加载示例
            </button>
            <button
              @click="onReset"
              class="text-sm px-3 py-1.5 rounded-md text-(--color-text-secondary) hover:text-(--color-danger-text) border border-(--color-border) hover:border-(--color-danger-border) transition-colors"
            >
              清空
            </button>
          </div>
        </div>

        <textarea
          v-model="input"
          placeholder='粘贴被 JSON.stringify 处理过的数据...&#10;&#10;例如：&#10;"{\\"name\\":\\"test\\",\\"age\\":20}"'
          class="w-full h-64 px-4 py-3 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm sm:text-base font-mono resize-y focus:outline-none focus:border-(--color-primary) transition-colors"
          @paste="onInputPaste"
          @keydown.meta.enter.prevent="onManualParse"
          @keydown.ctrl.enter.prevent="onManualParse"
          @keydown.meta.z.exact.prevent="undoInput"
          @keydown.ctrl.z.exact.prevent="undoInput"
        />

        <div class="flex flex-wrap items-center gap-3">
          <button
            @click="onManualParse"
            class="px-5 py-2 text-sm sm:text-base rounded-lg bg-(--color-primary) text-white hover:bg-(--color-primary-hover) transition-colors"
          >
            解析 (⌘+Enter)
          </button>
          <div class="flex items-center gap-2 text-sm text-(--color-text-secondary)">
            <label>最大深度：</label>
            <input
              type="number"
              v-model.number="maxDepth"
              min="1"
              max="50"
              class="w-16 px-2 py-1 rounded-md border border-(--color-border) bg-(--color-surface) text-center"
            />
          </div>
        </div>

        <div
          v-if="autoParseError"
          class="p-3 rounded-lg border text-sm"
          style="background: var(--color-warn-bg); border-color: var(--color-warn-border); color: var(--color-warn-text);"
        >
          {{ autoParseError }}
        </div>
      </div>

      <!-- 右侧：输出区 -->
      <div class="space-y-3">
        <div v-if="!result" class="flex flex-col items-center justify-center h-56 text-(--color-text-secondary) text-sm sm:text-base">
          <span class="text-3xl mb-2">⬅️</span>
          粘贴后会自动解析，也可手动点击解析
        </div>

        <template v-else>
          <!-- 错误信息 -->
          <div
            v-if="result.error"
            class="p-4 rounded-xl border text-sm sm:text-base"
            style="background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger-text);"
          >
            {{ result.error }}
          </div>

          <template v-else>
            <!-- 解析信息 + 结果树搜索 -->
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="px-3 py-1 rounded-full text-sm font-medium bg-(--color-primary)/10 text-(--color-primary)">
                  经过 {{ result.depth }} 层解析
                </span>
                <span class="text-sm text-(--color-text-secondary)">
                  最终类型：{{ typeof result.final === 'object' ? (Array.isArray(result.final) ? 'Array' : 'Object') : typeof result.final }}
                </span>
              </div>

              <!-- 搜索：仅作用于下方最终结果树，回车定位、Shift+Enter 上一个、Esc 清空 -->
              <div class="flex items-center gap-2">
                <input
                  v-model="searchInput"
                  @keydown="onSearchKeydown"
                  type="text"
                  placeholder="搜索 key / value，回车定位"
                  class="w-44 sm:w-56 px-3 py-1.5 rounded-lg border border-(--color-border) bg-(--color-surface) text-sm focus:outline-none focus:border-(--color-primary) transition-colors"
                />
                <template v-if="searchActive">
                  <span
                    class="text-sm tabular-nums whitespace-nowrap"
                    :class="matchCount ? 'text-(--color-text-secondary)' : 'text-(--color-danger-text)'"
                  >
                    {{ matchCount ? `${currentIndex + 1} / ${matchCount}` : '无匹配结果' }}
                  </span>
                  <button
                    v-if="matchCount"
                    @click="goPrev"
                    title="上一个 (Shift+Enter)"
                    class="px-2 py-1 rounded-md text-(--color-text-secondary) hover:text-(--color-primary) border border-(--color-border) hover:border-(--color-primary) transition-colors"
                  >
                    ↑
                  </button>
                  <button
                    v-if="matchCount"
                    @click="goNext"
                    title="下一个 (Enter)"
                    class="px-2 py-1 rounded-md text-(--color-text-secondary) hover:text-(--color-primary) border border-(--color-border) hover:border-(--color-primary) transition-colors"
                  >
                    ↓
                  </button>
                  <button
                    @click="clearSearch"
                    title="清空 (Esc)"
                    class="px-2 py-1 rounded-md text-(--color-text-secondary) hover:text-(--color-danger-text) border border-(--color-border) hover:border-(--color-danger-border) transition-colors"
                  >
                    ✕
                  </button>
                </template>
              </div>
            </div>

            <!-- 最终结果：vue-json-pretty 树形预览；搜索时关闭虚拟滚动并展开全部以定位命中 -->
            <div class="p-4 rounded-xl border border-(--color-border) bg-(--color-surface)">
              <div class="flex items-center justify-between mb-2 gap-2">
                <h3 class="text-base font-semibold text-(--color-text)">最终结果</h3>
                <CopyButton :text="formattedTree" label="复制 JSON" />
              </div>
              <div ref="treeWrapper" :class="searchActive ? 'max-h-[380px] overflow-auto' : ''">
                <VueJsonPretty
                  :key="treeKey"
                  :data="jsonData"
                  :deep="treeDeep"
                  :show-double-quotes="true"
                  :show-length="true"
                  :show-line="false"
                  :show-icon="true"
                  :collapsed-on-click-brackets="true"
                  :virtual="treeVirtual"
                  :height="380"
                  :item-height="22"
                  :render-node-key="renderNodeKey"
                  :render-node-value="renderNodeValue"
                  :render-node-actions="renderNodeActions"
                />
              </div>
            </div>

            <!-- 每层解析过程 -->
            <div v-if="result.layers.length > 1" class="space-y-2">
              <h3 class="text-base font-semibold text-(--color-text)">解析过程</h3>
              <div
                v-for="layer in result.layers"
                :key="layer.level"
                class="rounded-lg border border-(--color-border) bg-(--color-surface) overflow-hidden"
              >
                <button
                  @click="toggleLayer(layer.level)"
                  class="w-full px-4 py-2.5 flex items-center justify-between text-sm sm:text-base hover:bg-(--color-bg) transition-colors"
                >
                  <span class="font-medium">
                    第 {{ layer.level }} 层
                    <span class="ml-2 text-sm text-(--color-text-secondary)">→ {{ layer.type }}</span>
                  </span>
                  <span class="text-(--color-text-secondary) text-sm">
                    {{ expandedLayers.has(layer.level) ? '收起 ▲' : '展开 ▼' }}
                  </span>
                </button>
                <div v-if="expandedLayers.has(layer.level)" class="px-4 pb-3 border-t border-(--color-border)">
                  <pre class="text-sm font-mono mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-(--color-text-secondary)">{{ formatLayerOutput(layer.output) }}</pre>
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>
  </ToolLayout>
</template>

<style>
/* 命中高亮由 vue-json-pretty 子组件渲染，需用非 scoped 样式 */
.jsp-hit {
  background: var(--color-warn-bg);
  color: var(--color-warn-text);
  border-radius: 2px;
  padding: 0 1px;
}
.jsp-hit-current {
  background: var(--color-primary);
  color: #fff;
}

/* 复制按钮：复用 vue-json-pretty 的 .vjs-tree-node-actions 定位（hover 行才显示），去掉其默认浅蓝底 */
.vjs-tree .vjs-tree-node .vjs-tree-node-actions {
  background: transparent;
  padding: 0;
}
/* 仅 hover 行显示时用 flex 排布，保证两按钮竖直居中；默认仍走库的 display:none 隐藏 */
.vjs-tree .vjs-tree-node:hover .vjs-tree-node-actions {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}
.jsp-copy-action {
  display: inline-flex;
  align-items: center;
  height: 20px;
  box-sizing: border-box;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  padding: 0 7px;
  border-radius: 4px;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  opacity: 0.55;
  user-select: none;
  transition: opacity 0.15s, color 0.15s, border-color 0.15s;
}
.jsp-copy-action:hover {
  opacity: 1;
  color: var(--color-primary);
  border-color: var(--color-primary);
}
/* 删除按钮：红色警告图标，放在复制按钮之后，默认即醒目 */
.jsp-delete-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  box-sizing: border-box;
  cursor: pointer;
  padding: 0 5px;
  margin-left: 5px;
  border-radius: 4px;
  color: var(--color-danger-text);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
  user-select: none;
  transition: color 0.15s, background-color 0.15s, border-color 0.15s;
}
.jsp-delete-action svg {
  width: 14px;
  height: 14px;
  display: block;
}
.jsp-delete-action:hover {
  color: #fff;
  background: var(--color-danger-text);
  border-color: var(--color-danger-text);
}
</style>
