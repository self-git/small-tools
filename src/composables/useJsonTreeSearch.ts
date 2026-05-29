import { computed, h, nextTick, ref, type ComputedRef, type Ref, type VNode } from 'vue'

const HIT_CLASS = 'jsp-hit'
const CURRENT_CLASS = 'jsp-hit-current'
/** 搜索时展开的层级，足够大以保证命中节点不被折叠 */
const SEARCH_DEEP = 100
/** 非搜索状态下的默认折叠深度，与原 :deep 行为保持一致 */
const DEFAULT_DEEP = 3

type RenderDefault = string | VNode

export interface JsonTreeSearch {
  /** 搜索框双向绑定的实时输入 */
  searchInput: Ref<string>
  /** 命中总数 */
  matchCount: Ref<number>
  /** 当前命中项下标（0-based，无命中为 -1） */
  currentIndex: Ref<number>
  /** 是否处于搜索态（已提交关键字） */
  searchActive: ComputedRef<boolean>
  /** 绑定到 vue-json-pretty 的 key，关键字变化时重挂载以刷新高亮 */
  treeKey: ComputedRef<string>
  /** 树的折叠深度：搜索时展开全部 */
  treeDeep: ComputedRef<number>
  /** 虚拟滚动开关：搜索时关闭，保证命中节点进入 DOM */
  treeVirtual: ComputedRef<boolean>
  onSearchKeydown: (e: KeyboardEvent) => void
  goNext: () => void
  goPrev: () => void
  clearSearch: () => void
  renderNodeKey: (opt: { node: unknown; defaultKey: RenderDefault }) => unknown
  renderNodeValue: (opt: { node: unknown; defaultValue: RenderDefault }) => unknown
}

/**
 * 结果树搜索：高亮命中的 key/value，并支持命中计数与上一个/下一个跳转定位。
 * vue-json-pretty 无原生搜索，故用 renderNode* 渲染高亮 + DOM 查询做导航定位。
 * @param container 包裹 vue-json-pretty 的滚动容器，用于查询命中节点与滚动定位
 */
export function useJsonTreeSearch(container: Ref<HTMLElement | null>): JsonTreeSearch {
  const searchInput = ref('')
  /** 已提交的关键字，驱动高亮渲染（与实时输入区分，仅回车时同步） */
  const searchQuery = ref('')
  const matchCount = ref(0)
  const currentIndex = ref(-1)

  const searchActive = computed(() => searchQuery.value.length > 0)
  const treeKey = computed(() => searchQuery.value || '__tree__')
  const treeDeep = computed(() => (searchActive.value ? SEARCH_DEEP : DEFAULT_DEEP))
  const treeVirtual = computed(() => !searchActive.value)

  function buildHighlight(text: string, query: string): RenderDefault[] {
    const parts: RenderDefault[] = []
    const lower = text.toLowerCase()
    const q = query.toLowerCase()
    let i = 0
    while (i < text.length) {
      const idx = lower.indexOf(q, i)
      if (idx === -1) {
        parts.push(text.slice(i))
        break
      }
      if (idx > i) parts.push(text.slice(i, idx))
      parts.push(h('mark', { class: HIT_CLASS }, text.slice(idx, idx + q.length)))
      i = idx + q.length
    }
    return parts
  }

  /** 命中时返回带 <mark> 的片段数组，否则原样返回（忽略大小写） */
  function highlight(text: string): string | RenderDefault[] {
    const q = searchQuery.value
    if (!q || !text.toLowerCase().includes(q.toLowerCase())) return text
    return buildHighlight(text, q)
  }

  function renderNodeKey(opt: { node: unknown; defaultKey: RenderDefault }) {
    return typeof opt.defaultKey === 'string' ? highlight(opt.defaultKey) : opt.defaultKey
  }

  function renderNodeValue(opt: { node: unknown; defaultValue: RenderDefault }) {
    return typeof opt.defaultValue === 'string' ? highlight(opt.defaultValue) : opt.defaultValue
  }

  function marks(): HTMLElement[] {
    const root = container.value
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(`mark.${HIT_CLASS}`))
  }

  /** 清除旧的当前态，标记并滚动到 currentIndex 对应命中 */
  function applyCurrent() {
    const list = marks()
    list.forEach(el => el.classList.remove(CURRENT_CLASS))
    const el = list[currentIndex.value]
    if (!el) return
    el.classList.add(CURRENT_CLASS)
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  async function commitSearch() {
    searchQuery.value = searchInput.value.trim()
    await nextTick()
    const list = marks()
    matchCount.value = list.length
    currentIndex.value = list.length ? 0 : -1
    applyCurrent()
  }

  function move(step: number) {
    if (matchCount.value === 0) return
    currentIndex.value = (currentIndex.value + step + matchCount.value) % matchCount.value
    applyCurrent()
  }
  function goNext() { move(1) }
  function goPrev() { move(-1) }

  function clearSearch() {
    searchInput.value = ''
    searchQuery.value = ''
    matchCount.value = 0
    currentIndex.value = -1
  }

  function onSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        goPrev()
      } else if (searchInput.value.trim() !== searchQuery.value) {
        commitSearch()
      } else {
        goNext()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      clearSearch()
    }
  }

  return {
    searchInput,
    matchCount,
    currentIndex,
    searchActive,
    treeKey,
    treeDeep,
    treeVirtual,
    onSearchKeydown,
    goNext,
    goPrev,
    clearSearch,
    renderNodeKey,
    renderNodeValue,
  }
}
