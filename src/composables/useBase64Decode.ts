import { ref, computed } from 'vue'

export interface DecodeResult {
  dataUrl: string
  blob: Blob
  fileName: string
  mimeType: string
  isImage: boolean
  size: number
}

export interface DecodeError {
  message: string
  code: 'INVALID_FORMAT' | 'DECODE_FAILED' | 'UNKNOWN'
}

// MIME type to file extension mapping
const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/html': '.html',
  'text/css': '.css',
  'text/javascript': '.js',
  'application/json': '.json',
  'application/xml': '.xml',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'application/zip': '.zip',
  'application/gzip': '.gz',
}

// Common MIME type prefixes in Base64
const MIME_PREFIXES = [
  { prefix: 'data:image/png;base64,', mime: 'image/png' },
  { prefix: 'data:image/jpeg;base64,', mime: 'image/jpeg' },
  { prefix: 'data:image/jpg;base64,', mime: 'image/jpeg' },
  { prefix: 'data:image/gif;base64,', mime: 'image/gif' },
  { prefix: 'data:image/webp;base64,', mime: 'image/webp' },
  { prefix: 'data:image/svg+xml;base64,', mime: 'image/svg+xml' },
  { prefix: 'data:image/bmp;base64,', mime: 'image/bmp' },
  { prefix: 'data:application/pdf;base64,', mime: 'application/pdf' },
  { prefix: 'data:text/plain;base64,', mime: 'text/plain' },
  { prefix: 'data:audio/mpeg;base64,', mime: 'audio/mpeg' },
  { prefix: 'data:video/mp4;base64,', mime: 'video/mp4' },
  { prefix: 'data:application/zip;base64,', mime: 'application/zip' },
]

/** 简单字符串哈希，用于从内容稳定派生随机数 */
function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

/** 生成 YYYYMMDD 格式日期戳 */
function formatDateStamp(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export function useBase64Decode() {
  const result = ref<DecodeResult | null>(null)
  const loading = ref(false)
  const error = ref<DecodeError | null>(null)
  const fileName = ref('')
  const base64Input = ref('')

  // Computed: detected MIME type from input
  const detectedMime = computed(() => {
    const input = base64Input.value.trim()
    if (!input) return null

    for (const { prefix, mime } of MIME_PREFIXES) {
      if (input.startsWith(prefix)) {
        return mime
      }
    }
    return null
  })

  // Computed: suggested filename based on MIME type
  // base64 内容不携带原始文件名，用「内容派生随机位 + 日期戳」组成稳定文件名，如 78231_20260529
  const suggestedFileName = computed(() => {
    if (fileName.value) return fileName.value
    const ext = detectedMime.value ? (MIME_EXTENSIONS[detectedMime.value] || '.bin') : '.bin'
    const input = base64Input.value.trim()
    const seed = input ? parseBase64Input(input).data : ''
    const randomPart = String(hashString(seed) % 100000).padStart(5, '0')
    return `${randomPart}_${formatDateStamp(new Date())}${ext}`
  })

  /**
   * Clean Base64 string by removing whitespace and newlines
   */
  function cleanBase64(input: string): string {
    return input.replace(/[\s\r\n]+/g, '')
  }

  /**
   * Parse Base64 input and extract MIME type and data
   */
  function parseBase64Input(input: string): { mime: string | null; data: string } {
    const cleaned = cleanBase64(input)

    // Check for data URL format
    for (const { prefix, mime } of MIME_PREFIXES) {
      if (cleaned.startsWith(prefix)) {
        return {
          mime,
          data: cleaned.slice(prefix.length),
        }
      }
    }

    // Try to detect any data:xxx;base64, format
    const dataUrlMatch = cleaned.match(/^data:([^;]+);base64,(.+)$/)
    if (dataUrlMatch) {
      return {
        mime: dataUrlMatch[1],
        data: dataUrlMatch[2],
      }
    }

    // Pure Base64 without MIME prefix
    return {
      mime: null,
      data: cleaned,
    }
  }

  /**
   * Validate Base64 string
   */
  function isValidBase64(str: string): boolean {
    try {
      // Check if string contains only valid Base64 characters
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      if (!base64Regex.test(str)) {
        return false
      }
      // Try to decode
      atob(str)
      return true
    } catch {
      return false
    }
  }

  /**
   * Convert Base64 to Uint8Array
   */
  function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }

  /**
   * Decode Base64 string to file
   */
  async function decode(): Promise<void> {
    loading.value = true
    error.value = null
    result.value = null

    try {
      const input = base64Input.value.trim()
      if (!input) {
        error.value = {
          message: '请输入 Base64 字符串',
          code: 'INVALID_FORMAT',
        }
        return
      }

      const { mime, data } = parseBase64Input(input)

      if (!isValidBase64(data)) {
        error.value = {
          message: '无效的 Base64 格式，请检查输入',
          code: 'INVALID_FORMAT',
        }
        return
      }

      const bytes = base64ToUint8Array(data)
      const mimeType = mime || 'application/octet-stream'
      const blob = new Blob([bytes], { type: mimeType })

      // Create data URL for preview
      const dataUrl = `data:${mimeType};base64,${data}`

      // Determine filename
      const finalFileName = fileName.value || suggestedFileName.value

      result.value = {
        dataUrl,
        blob,
        fileName: finalFileName,
        mimeType,
        isImage: mimeType.startsWith('image/'),
        size: blob.size,
      }
    } catch (e) {
      error.value = {
        message: e instanceof Error ? e.message : '解码失败，请检查输入格式',
        code: 'DECODE_FAILED',
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Load image dimensions for preview
   */
  function loadImageDimensions(): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      if (!result.value?.isImage) {
        resolve(null)
        return
      }

      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = () => {
        resolve(null)
      }
      img.src = result.value.dataUrl
    })
  }

  /**
   * Download the decoded file
   */
  function download(): void {
    if (!result.value) return

    const url = URL.createObjectURL(result.value.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.value.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Reset state
   */
  function reset(): void {
    result.value = null
    error.value = null
    fileName.value = ''
    base64Input.value = ''
  }

  return {
    result,
    loading,
    error,
    fileName,
    base64Input,
    detectedMime,
    suggestedFileName,
    decode,
    download,
    loadImageDimensions,
    reset,
  }
}
