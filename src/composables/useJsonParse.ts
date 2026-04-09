import { ref, computed } from 'vue'

export interface ParseLayer {
  level: number
  input: string
  output: unknown
  type: string
}

export interface ParseResult {
  depth: number
  layers: ParseLayer[]
  final: unknown
  error: string | null
}

/** 清理输入：去除 BOM、首尾空白 */
function sanitize(input: string): string {
  return input.replace(/^\uFEFF/, '').trim()
}

/** 尝试 JSON.parse，失败返回 null */
function tryParse(s: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(s) }
  } catch {
    return { ok: false }
  }
}

/** 判断一个值是否像被 stringify 过的 JSON 字符串 */
function looksLikeJson(s: string): boolean {
  const t = s.trim()
  return (
    (t.startsWith('{') && t.endsWith('}')) ||
    (t.startsWith('[') && t.endsWith(']')) ||
    (t.startsWith('"') && t.endsWith('"'))
  )
}

/**
 * 递归解析多层 stringify 的值
 * 返回最终结果和经过的层数
 */
function deepParseLayers(input: string, maxDepth: number): ParseLayer[] {
  const layers: ParseLayer[] = []
  let current: unknown = input
  let level = 0

  while (level < maxDepth && typeof current === 'string') {
    const attempt = tryParse(current)
    if (!attempt.ok) break

    level++
    layers.push({
      level,
      input: current,
      output: attempt.value,
      type: typeof attempt.value === 'object'
        ? (Array.isArray(attempt.value) ? 'array' : (attempt.value === null ? 'null' : 'object'))
        : typeof attempt.value,
    })
    current = attempt.value

    if (typeof current === 'string' && !looksLikeJson(current)) break
  }

  return layers
}

/**
 * 深度遍历对象/数组，对每个 string value 尝试递归 parse
 * 返回处理后的对象（展开所有嵌套 stringify）
 */
function deepParseValues(obj: unknown, maxDepth: number): unknown {
  if (typeof obj === 'string') {
    const layers = deepParseLayers(obj, maxDepth)
    if (layers.length > 0) {
      const final = layers[layers.length - 1].output
      return deepParseValues(final, maxDepth)
    }
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepParseValues(item, maxDepth))
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = deepParseValues(value, maxDepth)
    }
    return result
  }

  return obj
}

export function smartParse(input: string, maxDepth = 10): ParseResult {
  const cleaned = sanitize(input)

  if (!cleaned) {
    return { depth: 0, layers: [], final: null, error: '输入为空' }
  }

  const directParse = tryParse(cleaned)

  if (!directParse.ok) {
    // 尝试去掉首尾的多余引号再解析
    let retryInput = cleaned
    if (
      (retryInput.startsWith("'") && retryInput.endsWith("'")) ||
      (retryInput.startsWith('`') && retryInput.endsWith('`'))
    ) {
      retryInput = retryInput.slice(1, -1)
    }
    const retryParse = tryParse(retryInput)
    if (!retryParse.ok) {
      return { depth: 0, layers: [], final: cleaned, error: 'JSON 解析失败：输入不是合法的 JSON 格式' }
    }
    const layers = deepParseLayers(retryInput, maxDepth)
    if (layers.length === 0) {
      return { depth: 0, layers: [], final: retryParse.value, error: null }
    }
    const rawFinal = layers[layers.length - 1].output
    const final = deepParseValues(rawFinal, maxDepth)
    return { depth: layers.length, layers, final, error: null }
  }

  // 如果直接解析成功但结果是字符串，继续递归
  if (typeof directParse.value === 'string') {
    const layers = deepParseLayers(cleaned, maxDepth)
    const rawFinal = layers.length > 0 ? layers[layers.length - 1].output : directParse.value
    const final = deepParseValues(rawFinal, maxDepth)
    return { depth: layers.length, layers, final, error: null }
  }

  // 直接解析为对象/数组，检查内部是否有嵌套 stringify
  const final = deepParseValues(directParse.value, maxDepth)
  const hasNested = JSON.stringify(final) !== JSON.stringify(directParse.value)

  return {
    depth: hasNested ? 1 : 0,
    layers: [{
      level: 1,
      input: cleaned,
      output: directParse.value,
      type: Array.isArray(directParse.value) ? 'array' : 'object',
    }],
    final,
    error: null,
  }
}

export function useJsonParse() {
  const input = ref('')
  const maxDepth = ref(10)
  const result = ref<ParseResult | null>(null)
  const expandedLayers = ref<Set<number>>(new Set())

  function parse() {
    if (!input.value.trim()) {
      result.value = null
      return
    }
    expandedLayers.value = new Set()
    result.value = smartParse(input.value, maxDepth.value)
  }

  function toggleLayer(level: number) {
    const s = new Set(expandedLayers.value)
    if (s.has(level)) s.delete(level)
    else s.add(level)
    expandedLayers.value = s
  }

  const formattedFinal = computed(() => {
    if (!result.value || result.value.error) return ''
    try {
      return JSON.stringify(result.value.final, null, 2)
    } catch {
      return String(result.value.final)
    }
  })

  function reset() {
    input.value = ''
    result.value = null
    expandedLayers.value = new Set()
  }

  return {
    input,
    maxDepth,
    result,
    expandedLayers,
    formattedFinal,
    parse,
    toggleLayer,
    reset,
  }
}
