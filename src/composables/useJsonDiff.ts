export type DiffKind = 'only_a' | 'only_b' | 'value' | 'type'
export type CompareMode = 'strict' | 'loose'

export interface DiffEntry {
  path: string
  kind: DiffKind
  valueA?: unknown
  valueB?: unknown
}

export const DIFF_KIND_LABELS: Record<DiffKind, string> = {
  only_a: '仅 A 有',
  only_b: '仅 B 有',
  value: '值不同',
  type: '类型不同',
}

type PathSegment = string | number

function valueType(v: unknown): string {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v
}

function toComparableNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function looseLeafEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  const na = toComparableNumber(a)
  const nb = toComparableNumber(b)
  if (na !== null && nb !== null) return na === nb
  return false
}

/** 路径展示：a.b["中文"][0] */
export function formatPath(segments: PathSegment[]): string {
  let path = ''
  for (const seg of segments) {
    if (typeof seg === 'number') {
      path += `[${seg}]`
    } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(seg)) {
      path += path ? `.${seg}` : seg
    } else {
      path += `["${seg.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`
    }
  }
  return path
}

/** vue-json-pretty 节点 path（rootPath 为 root） */
export function toTreePath(displayPath: string): string {
  return displayPath ? `root.${displayPath}` : 'root'
}

function pushEntry(out: DiffEntry[], segments: PathSegment[], entry: Omit<DiffEntry, 'path'>) {
  out.push({ path: formatPath(segments), ...entry })
}

function looseArrayEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false
  const sig = (item: unknown) => JSON.stringify(item)
  const sa = a.map(sig).sort()
  const sb = b.map(sig).sort()
  return sa.every((s, i) => s === sb[i])
}

function diffValues(
  a: unknown,
  b: unknown,
  segments: PathSegment[],
  out: DiffEntry[],
  mode: CompareMode,
) {
  const ta = valueType(a)
  const tb = valueType(b)
  if (ta !== tb) {
    pushEntry(out, segments, { kind: 'type', valueA: a, valueB: b })
    return
  }

  if (ta === 'array') {
    const arrA = a as unknown[]
    const arrB = b as unknown[]
    if (mode === 'loose' && looseArrayEqual(arrA, arrB)) return
    if (mode === 'loose') {
      pushEntry(out, segments, { kind: 'value', valueA: a, valueB: b })
      return
    }
    const max = Math.max(arrA.length, arrB.length)
    for (let i = 0; i < max; i++) {
      if (i >= arrA.length) {
        pushEntry(out, [...segments, i], { kind: 'only_b', valueB: arrB[i] })
      } else if (i >= arrB.length) {
        pushEntry(out, [...segments, i], { kind: 'only_a', valueA: arrA[i] })
      } else {
        diffValues(arrA[i], arrB[i], [...segments, i], out, mode)
      }
    }
    return
  }

  if (ta === 'object') {
    const objA = a as Record<string, unknown>
    const objB = b as Record<string, unknown>
    const keys = new Set([...Object.keys(objA), ...Object.keys(objB)])
    for (const key of keys) {
      const hasA = Object.prototype.hasOwnProperty.call(objA, key)
      const hasB = Object.prototype.hasOwnProperty.call(objB, key)
      if (!hasA && hasB) {
        pushEntry(out, [...segments, key], { kind: 'only_b', valueB: objB[key] })
      } else if (hasA && !hasB) {
        pushEntry(out, [...segments, key], { kind: 'only_a', valueA: objA[key] })
      } else {
        diffValues(objA[key], objB[key], [...segments, key], out, mode)
      }
    }
    return
  }

  const equal = mode === 'loose' ? looseLeafEqual(a, b) : Object.is(a, b)
  if (!equal) {
    pushEntry(out, segments, { kind: 'value', valueA: a, valueB: b })
  }
}

export function diffJson(a: unknown, b: unknown, mode: CompareMode): DiffEntry[] {
  const out: DiffEntry[] = []
  diffValues(a, b, [], out, mode)
  return out
}

export function formatDiffValue(v: unknown): string {
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return JSON.stringify(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export function formatDiffReport(entries: DiffEntry[], mode: CompareMode): string {
  const modeLabel = mode === 'strict' ? '严格模式' : '宽松模式'
  const lines = [`JSON 对比报告（${modeLabel}）`, `共 ${entries.length} 处差异`, '']
  for (const e of entries) {
    const label = DIFF_KIND_LABELS[e.kind]
    if (e.kind === 'only_a') {
      lines.push(`[${label}] ${e.path}: ${formatDiffValue(e.valueA)}`)
    } else if (e.kind === 'only_b') {
      lines.push(`[${label}] ${e.path}: ${formatDiffValue(e.valueB)}`)
    } else if (e.kind === 'type') {
      lines.push(`[${label}] ${e.path}: ${valueType(e.valueA)} → ${valueType(e.valueB)}`)
    } else {
      lines.push(`[${label}] ${e.path}: ${formatDiffValue(e.valueA)} → ${formatDiffValue(e.valueB)}`)
    }
  }
  return lines.join('\n')
}
