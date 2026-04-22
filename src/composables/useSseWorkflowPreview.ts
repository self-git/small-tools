import { computed, ref, type ComputedRef, type Ref } from 'vue'

/** 工作流 SSE 事件 data 解析后的原始结构 */
export type WorkflowEventPayload = {
  id: string
  name: string
  sourceId: string | null
  sourceTypeName: string
  role: string
  result: string | null
  resultType: string
  actionType: string
}

export type WorkflowStepStatus = 'running' | 'completed'

/** 聚合后的单个节点步骤，气泡渲染使用 */
export type WorkflowStep = {
  /** 通常等于 sourceId；SuperStep 才为 null，但 SuperStep 已被滤掉不会出现在 steps 中 */
  stepId: string
  /** 步骤名，如 "开始" / "代码执行" / "AI对话" */
  name: string
  /** 节点类型，如 "start" / "codeExecution" / "aiDialog" / 其他 */
  sourceTypeName: string
  /** 执行角色，如 "Executor" */
  role: string
  status: WorkflowStepStatus
  /** aiDialog 流式 Output 累积文本；其他类型保持空 */
  streamText: string
  /** Started 事件 result（JSON 字符串已解析）；解析失败时为原始字符串 */
  startedPayload: unknown
  /** Completed 事件 result（JSON 字符串已解析）；解析失败时为原始字符串 */
  completedPayload: unknown
  /** 首次出现顺序，决定渲染顺序 */
  order: number
}

export type SseWorkflowStats = {
  blockCount: number
  messageParsed: number
  skippedNonMessage: number
  doneMarkers: number
  superStepSkipped: number
}

export type SseWorkflowResult = {
  steps: WorkflowStep[]
  errors: string[]
  stats: SseWorkflowStats
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function readStr(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function parseHeaderLine(line: string): { key: string; value: string } | null {
  const idx = line.indexOf(':')
  if (idx === -1) return null
  const key = line.slice(0, idx).trim().toLowerCase()
  let value = line.slice(idx + 1)
  if (value.startsWith(' ')) value = value.slice(1)
  return { key, value: value.trimEnd() }
}

/**
 * 解析单个 SSE 块：兼容 `data:` 多行合并（SSE 规范是换行拼 \n）
 */
function parseSseBlock(block: string): { event: string | null; data: string | null } {
  let event: string | null = null
  const dataLines: string[] = []
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trimEnd()
    if (!line) continue
    const parsed = parseHeaderLine(line)
    if (!parsed) continue
    if (parsed.key === 'event') event = parsed.value
    else if (parsed.key === 'data') dataLines.push(parsed.value)
  }
  return { event, data: dataLines.length ? dataLines.join('\n') : null }
}

/** 把事件 JSON data 收窄为 WorkflowEventPayload，保守兜底空值 */
function coerceEvent(obj: Record<string, unknown>): WorkflowEventPayload {
  const sourceIdRaw = obj.sourceId
  return {
    id: readStr(obj.id),
    name: readStr(obj.name),
    sourceId: sourceIdRaw == null ? null : readStr(sourceIdRaw),
    sourceTypeName: readStr(obj.sourceTypeName),
    role: readStr(obj.role),
    result: obj.result == null ? null : readStr(obj.result),
    resultType: readStr(obj.resultType),
    actionType: readStr(obj.actionType),
  }
}

/**
 * 尝试把 result 字段按 resultType 解析；失败时保留原始字符串，避免直接报错淹没整体解析
 */
function parseResultField(result: string | null, resultType: string): unknown {
  if (result == null || result === '') return null
  if (resultType === 'json') {
    try {
      return JSON.parse(result) as unknown
    } catch {
      return result
    }
  }
  return result
}

/**
 * 聚合事件为步骤：按 sourceId 分组；SuperStep 和缺失 sourceId 的事件跳过
 * 同一 sourceId 的生命周期：Started -> (Output)* -> Completed
 */
export function groupEventsToSteps(events: readonly WorkflowEventPayload[]): {
  steps: WorkflowStep[]
  superStepSkipped: number
} {
  const map = new Map<string, WorkflowStep>()
  let orderCursor = 0
  let superStepSkipped = 0

  for (const ev of events) {
    if (ev.role === 'SuperStep' || !ev.sourceId) {
      if (ev.role === 'SuperStep') superStepSkipped += 1
      continue
    }
    const key = ev.sourceId
    let step = map.get(key)
    if (!step) {
      step = {
        stepId: key,
        name: ev.name,
        sourceTypeName: ev.sourceTypeName,
        role: ev.role,
        status: 'running',
        streamText: '',
        startedPayload: null,
        completedPayload: null,
        order: orderCursor++,
      }
      map.set(key, step)
    }

    // name / type 以首个非空事件为准，后续事件里的空值不覆盖
    if (!step.name && ev.name) step.name = ev.name
    if (!step.sourceTypeName && ev.sourceTypeName) step.sourceTypeName = ev.sourceTypeName
    if (!step.role && ev.role) step.role = ev.role

    const action = ev.actionType
    if (action === 'Started') {
      step.startedPayload = parseResultField(ev.result, ev.resultType)
      step.status = step.status === 'completed' ? 'completed' : 'running'
    } else if (action === 'Output') {
      if (ev.result != null) step.streamText += ev.result
    } else if (action === 'Completed') {
      step.completedPayload = parseResultField(ev.result, ev.resultType)
      step.status = 'completed'
    }
  }

  const steps = [...map.values()].sort((a, b) => a.order - b.order)
  return { steps, superStepSkipped }
}

/**
 * 工作流 SSE 文本解析入口：
 * 1. 拆块（空行分隔）；2. 提取 event + data；3. 过滤非 Message / [DONE]；4. JSON 解析；5. 按 sourceId 聚合成步骤
 */
export function parseSseWorkflow(raw: string): SseWorkflowResult {
  const errors: string[] = []
  const events: WorkflowEventPayload[] = []
  const stats: SseWorkflowStats = {
    blockCount: 0,
    messageParsed: 0,
    skippedNonMessage: 0,
    doneMarkers: 0,
    superStepSkipped: 0,
  }

  const text = raw.replace(/\r\n/g, '\n').trim()
  if (!text) return { steps: [], errors: [], stats }

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
      errors.push(
        `第 ${blockIndex + 1} 个 Message 块 JSON 解析失败：${e instanceof Error ? e.message : String(e)}`,
      )
      return
    }
    if (!isRecord(parsed)) {
      errors.push(`第 ${blockIndex + 1} 个 Message 块 data 不是 JSON 对象`)
      return
    }
    events.push(coerceEvent(parsed))
    stats.messageParsed += 1
  })

  const { steps, superStepSkipped } = groupEventsToSteps(events)
  stats.superStepSkipped = superStepSkipped
  return { steps, errors, stats }
}

export type UseSseWorkflowPreview = {
  raw: Ref<string>
  result: ComputedRef<SseWorkflowResult>
  reset: () => void
}

export function useSseWorkflowPreview(initialRaw = ''): UseSseWorkflowPreview {
  const raw = ref(initialRaw)
  const result = computed(() => parseSseWorkflow(raw.value))
  const reset = () => {
    raw.value = ''
  }
  return { raw, result, reset }
}
