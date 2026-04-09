import { ref, computed } from 'vue'

export type ImageFormat = 'image/png' | 'image/jpeg' | 'image/webp'

export interface Base64Options {
  format: ImageFormat
  quality: number
  scale: number
}

export interface Base64Result {
  base64: string
  originalSize: number
  encodedSize: number
  width: number
  height: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function useBase64() {
  const result = ref<Base64Result | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** 当前来源：file 或 svg 代码 */
  const sourceType = ref<'file' | 'svg' | null>(null)

  const options = ref<Base64Options>({
    format: 'image/png',
    quality: 0.92,
    scale: 1,
  })

  /** 当前加载的原始图片，用于选项变化时重新转换 */
  let currentImage: HTMLImageElement | null = null
  let currentOriginalSize = 0

  const formattedOriginalSize = computed(() =>
    result.value ? formatSize(result.value.originalSize) : ''
  )
  const formattedEncodedSize = computed(() =>
    result.value ? formatSize(result.value.encodedSize) : ''
  )

  /** 通过 Canvas 转换（支持格式/质量/缩放） */
  function convertViaCanvas(img: HTMLImageElement, originalSize: number, opts: Base64Options): Base64Result {
    const w = Math.round(img.naturalWidth * opts.scale)
    const h = Math.round(img.naturalHeight * opts.scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)

    const base64 = canvas.toDataURL(opts.format, opts.quality)
    return {
      base64,
      originalSize,
      encodedSize: base64.length,
      width: w,
      height: h,
    }
  }

  /** 从文件转换 */
  function convertFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      loading.value = true
      error.value = null
      sourceType.value = 'file'

      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          currentImage = img
          currentOriginalSize = file.size
          result.value = convertViaCanvas(img, file.size, options.value)
          loading.value = false
          resolve()
        }
        img.onerror = () => {
          error.value = '图片加载失败，请检查文件格式'
          loading.value = false
          reject(new Error(error.value))
        }
        img.src = reader.result as string
      }
      reader.onerror = () => {
        error.value = '文件读取失败'
        loading.value = false
        reject(new Error(error.value))
      }
      reader.readAsDataURL(file)
    })
  }

  /** 从 SVG 代码转换 */
  function convertSvgCode(svgCode: string): void {
    error.value = null
    sourceType.value = 'svg'
    currentImage = null

    const trimmed = svgCode.trim()
    if (!trimmed.startsWith('<svg') && !trimmed.startsWith('<?xml')) {
      error.value = 'SVG 代码格式不正确，需要以 <svg 开头'
      return
    }

    const encoded = btoa(unescape(encodeURIComponent(trimmed)))
    const base64 = `data:image/svg+xml;base64,${encoded}`
    const originalSize = new Blob([trimmed]).size

    result.value = {
      base64,
      originalSize,
      encodedSize: base64.length,
      width: 0,
      height: 0,
    }

    const img = new Image()
    img.onload = () => {
      if (result.value) {
        result.value.width = img.naturalWidth
        result.value.height = img.naturalHeight
      }
    }
    img.src = base64
  }

  /** 选项变更后重新转换（仅对 file 来源有效） */
  function reconvert() {
    if (currentImage && sourceType.value === 'file') {
      result.value = convertViaCanvas(currentImage, currentOriginalSize, options.value)
    }
  }

  /** 生成 img 标签 */
  const imgTag = computed(() =>
    result.value ? `<img src="${result.value.base64}" alt="" />` : ''
  )

  /** 生成 CSS background */
  const cssBg = computed(() =>
    result.value ? `background-image: url(${result.value.base64});` : ''
  )

  function reset() {
    result.value = null
    error.value = null
    sourceType.value = null
    currentImage = null
    currentOriginalSize = 0
  }

  return {
    result,
    loading,
    error,
    options,
    sourceType,
    formattedOriginalSize,
    formattedEncodedSize,
    imgTag,
    cssBg,
    convertFile,
    convertSvgCode,
    reconvert,
    reset,
  }
}
