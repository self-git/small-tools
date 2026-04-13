import { computed, ref, type ComputedRef, type Ref } from 'vue'

/** 与服务端 Message JSON（PascalCase）对齐，便于扩展字段 */
export type StreamMessagePayload = {
  id: unknown
  RelationId: unknown
  IsStream: boolean
  Role: string | null
  Name: string | null
  AnotherName: string | null
  Content: string
  IsEnd: boolean
  BinaryContent: unknown
  ContentType: string | null
  FunctionCallsInfo: unknown
  FunctionResultInfo: unknown
  IsKnowledgeSearchPlugin: boolean
  SendTime: string | null
  Sort: unknown
  Icon: unknown
  FileIdList: unknown[]
  Type: number
  IsShow: boolean
}

export type ChatBubble = {
  role: string
  /** 同 Role 下可见片段按序拼接后的正文 */
  text: string
}

export type SseChatPreviewStats = {
  blockCount: number
  messageParsed: number
  skippedNonMessage: number
  doneMarkers: number
}

export type SseChatPreviewResult = {
  bubbles: ChatBubble[]
  errors: string[]
  stats: SseChatPreviewStats
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function readBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function readStr(v: unknown): string | null {
  return typeof v === 'string' ? v : v == null ? null : String(v)
}

/** 将 JSON 对象收窄为 StreamMessagePayload（字段缺失时用安全默认值） */
function coercePayload(obj: Record<string, unknown>): StreamMessagePayload {
  return {
    id: obj.id,
    RelationId: obj.RelationId,
    IsStream: readBool(obj.IsStream, false),
    Role: readStr(obj.Role),
    Name: readStr(obj.Name),
    AnotherName: readStr(obj.AnotherName),
    Content: readStr(obj.Content) ?? '',
    IsEnd: readBool(obj.IsEnd, false),
    BinaryContent: obj.BinaryContent,
    ContentType: readStr(obj.ContentType),
    FunctionCallsInfo: obj.FunctionCallsInfo,
    FunctionResultInfo: obj.FunctionResultInfo,
    IsKnowledgeSearchPlugin: readBool(obj.IsKnowledgeSearchPlugin, false),
    SendTime: readStr(obj.SendTime),
    Sort: obj.Sort,
    Icon: obj.Icon,
    FileIdList: Array.isArray(obj.FileIdList) ? obj.FileIdList : [],
    Type: typeof obj.Type === 'number' ? obj.Type : Number(obj.Type) || 0,
    IsShow: readBool(obj.IsShow, true),
  }
}

/** Role 为空时归为 assistant，避免无法进组 */
export function normalizeChatRole(role: string | null | undefined): string {
  const s = typeof role === 'string' ? role.trim() : ''
  return s || 'assistant'
}

function parseHeaderLine(line: string): { key: string; value: string } | null {
  const idx = line.indexOf(':')
  if (idx === -1) return null
  const key = line.slice(0, idx).trim().toLowerCase()
  let value = line.slice(idx + 1)
  if (value.startsWith(' ')) value = value.slice(1)
  return { key, value: value.trimEnd() }
}

function parseSseBlock(block: string): { event: string | null; data: string | null } {
  let event: string | null = null
  let data: string | null = null
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trimEnd()
    if (!line) continue
    const parsed = parseHeaderLine(line)
    if (!parsed) continue
    if (parsed.key === 'event') event = parsed.value
    if (parsed.key === 'data') data = parsed.value
  }
  return { event, data }
}

/** 同 Role 连续 Message：IsShow 为真才拼接 Content；Role 变化则新气泡 */
export function mergeStreamMessagesToBubbles(messages: readonly StreamMessagePayload[]): ChatBubble[] {
  const out: ChatBubble[] = []
  let curRole: string | null = null
  let curText = ''

  for (const p of messages) {
    const role = normalizeChatRole(p.Role)
    if (curRole !== null && role !== curRole) {
      if (curText.trim()) out.push({ role: curRole, text: curText })
      curRole = null
      curText = ''
    }
    if (curRole === null) curRole = role
    if (p.IsShow) curText += p.Content
  }

  if (curRole !== null && curText.trim()) out.push({ role: curRole, text: curText })
  return out
}

export function parseSseChatPreview(raw: string): SseChatPreviewResult {
  const errors: string[] = []
  const messages: StreamMessagePayload[] = []
  const stats: SseChatPreviewStats = {
    blockCount: 0,
    messageParsed: 0,
    skippedNonMessage: 0,
    doneMarkers: 0,
  }

  const text = raw.replace(/\r\n/g, '\n').trim()
  if (!text) {
    return { bubbles: [], errors: [], stats }
  }

  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  stats.blockCount = blocks.length

  blocks.forEach((block, blockIndex) => {
    const { event, data } = parseSseBlock(block)
    if (!event || event.toLowerCase() !== 'message') {
      stats.skippedNonMessage += 1
      return
    }
    if (data == null || data.trim() === '') {
      errors.push(`第 ${blockIndex + 1} 个 Message 块缺少 data`)
      return
    }
    const trimmed = data.trim()
    if (trimmed === '[DONE]') {
      stats.doneMarkers += 1
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed) as unknown
    } catch (e) {
      errors.push(`第 ${blockIndex + 1} 个 Message 块 JSON 解析失败：${e instanceof Error ? e.message : String(e)}`)
      return
    }
    if (!isRecord(parsed)) {
      errors.push(`第 ${blockIndex + 1} 个 Message 块 data 不是 JSON 对象`)
      return
    }
    messages.push(coercePayload(parsed))
    stats.messageParsed += 1
  })

  const bubbles = mergeStreamMessagesToBubbles(messages)
  return { bubbles, errors, stats }
}

export type UseSseChatPreview = {
  raw: Ref<string>
  result: ComputedRef<SseChatPreviewResult>
  reset: () => void
}

export function useSseChatPreview(initialRaw = ''): UseSseChatPreview {
  const raw = ref(initialRaw)
  const result = computed(() => parseSseChatPreview(raw.value))
  const reset = () => {
    raw.value = ''
  }
  return { raw, result, reset }
}
