<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import ToolLayout from '@/components/ToolLayout.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import CopyButton from '@/components/CopyButton.vue'
import { useBase64 } from '@/composables/useBase64'
import { useBase64Decode } from '@/composables/useBase64Decode'
import type { ImageFormat } from '@/composables/useBase64'

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// Base64 encoding composable
const {
  result, loading, error, options, sourceType,
  formattedOriginalSize, formattedEncodedSize, imgTag, cssBg,
  convertAnyFile, convertSvgCode, reconvert, reset,
} = useBase64()

// Base64 decoding composable
const {
  result: decodeResult,
  loading: decodeLoading,
  error: decodeError,
  fileName: decodeFileName,
  base64Input,
  detectedMime,
  suggestedFileName,
  decode: decodeBase64,
  download: downloadDecoded,
  loadImageDimensions,
  reset: resetDecode,
} = useBase64Decode()

/** 输入模式切换 */
const inputMode = ref<'file' | 'svg' | 'decode'>('file')
const svgInput = ref('')

/** 当前文件是否是图片 */
const isImageFile = computed(() => result.value?.isImage ?? false)

/** 解码后的图片尺寸 */
const decodeImageDimensions = ref<{ width: number; height: number } | null>(null)

function onFile(file: File) {
  reset()
  convertAnyFile(file)
}

function onSvgConvert() {
  if (!svgInput.value.trim()) return
  reset()
  convertSvgCode(svgInput.value)
}

async function onDecode() {
  if (!base64Input.value.trim()) return
  await decodeBase64()
  // Load image dimensions if it's an image
  const dims = await loadImageDimensions()
  decodeImageDimensions.value = dims
}

function switchMode(mode: 'file' | 'svg' | 'decode') {
  inputMode.value = mode
  if (mode === 'decode') {
    reset()
  } else {
    resetDecode()
    decodeImageDimensions.value = null
  }
}

watch(
  () => ({ ...options.value }),
  () => { if (sourceType.value === 'file') reconvert() }
)

const formatOptions: { label: string; value: ImageFormat }[] = [
  { label: 'PNG', value: 'image/png' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'WebP', value: 'image/webp' },
]

const scaleOptions = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
]

function downloadAsText() {
  if (!result.value) return
  const blob = new Blob([result.value.base64], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'base64.txt'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <ToolLayout title="Base64 转换" desc="支持文件→Base64编码和Base64→文件解码的双向转换工具">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <!-- 左侧：输入区 -->
      <div class="space-y-3">
        <!-- 模式切换 -->
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="m in ([{ key: 'file', label: '📷 文件上传' }, { key: 'svg', label: '📝 SVG 代码' }, { key: 'decode', label: '🔓 Base64 解码' }] as const)"
            :key="m.key"
            @click="switchMode(m.key)"
            class="px-4 py-2 text-sm sm:text-base rounded-lg transition-all"
            :class="inputMode === m.key
              ? 'bg-(--color-primary) text-white'
              : 'bg-(--color-surface) text-(--color-text-secondary) border border-(--color-border) hover:border-(--color-primary)'"
          >
            {{ m.label }}
          </button>
        </div>

        <!-- 文件上传 -->
        <FileDropZone
          v-if="inputMode === 'file'"
          accept="*/*"
          @file="onFile"
        />

        <!-- SVG 代码输入 -->
        <div v-else-if="inputMode === 'svg'" class="space-y-3">
          <textarea
            v-model="svgInput"
            placeholder="在此粘贴 SVG 代码，例如：&#10;<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 100 100&quot;>&#10;  <circle cx=&quot;50&quot; cy=&quot;50&quot; r=&quot;40&quot; fill=&quot;#6366f1&quot;/>&#10;</svg>"
            class="w-full h-44 px-4 py-3 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm sm:text-base font-mono resize-y focus:outline-none focus:border-(--color-primary) transition-colors"
          />
          <button
            @click="onSvgConvert"
            class="px-4 py-2 text-sm sm:text-base rounded-lg bg-(--color-primary) text-white hover:bg-(--color-primary-hover) transition-colors"
          >
            转换
          </button>
        </div>

        <!-- Base64 解码输入 -->
        <div v-else class="space-y-3">
          <div class="space-y-2">
            <label class="text-sm font-medium text-(--color-text)">Base64 字符串</label>
            <textarea
              v-model="base64Input"
              placeholder="在此粘贴 Base64 字符串，支持以下格式：&#10;• 完整格式：data:image/png;base64,iVBORw0KGgo...&#10;• 纯 Base64：iVBORw0KGgo...&#10;• 包含空格/换行符的 Base64"
              class="w-full h-44 px-4 py-3 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm sm:text-base font-mono resize-y focus:outline-none focus:border-(--color-primary) transition-colors"
            />
          </div>

          <!-- 检测到的 MIME 类型 -->
          <div v-if="detectedMime" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-(--color-bg) text-sm">
            <span class="text-(--color-text-secondary)">检测到类型：</span>
            <span class="font-medium text-(--color-primary)">{{ detectedMime }}</span>
          </div>

          <!-- 文件名输入 -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-(--color-text)">文件名</label>
            <input
              v-model="decodeFileName"
              type="text"
              :placeholder="suggestedFileName"
              class="w-full px-4 py-2.5 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm sm:text-base focus:outline-none focus:border-(--color-primary) transition-colors"
            />
            <p class="text-xs text-(--color-text-secondary)">
              留空将使用默认文件名：{{ suggestedFileName }}
            </p>
          </div>

          <button
            @click="onDecode"
            :disabled="decodeLoading || !base64Input.trim()"
            class="px-4 py-2 text-sm sm:text-base rounded-lg bg-(--color-primary) text-white hover:bg-(--color-primary-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ decodeLoading ? '解码中...' : '解码并下载' }}
          </button>
        </div>

        <!-- 转换选项（仅图片文件模式） -->
        <div v-if="sourceType === 'file' && isImageFile" class="p-4 rounded-xl border border-(--color-border) bg-(--color-surface) space-y-3">
          <h3 class="text-base font-semibold text-(--color-text)">转换选项</h3>

          <!-- 输出格式 -->
          <div>
            <label class="text-sm text-(--color-text-secondary) mb-1.5 block">输出格式</label>
            <div class="flex gap-2">
              <button
                v-for="f in formatOptions"
                :key="f.value"
                @click="options.format = f.value"
                class="px-3 py-1.5 text-sm rounded-md transition-all"
                :class="options.format === f.value
                  ? 'bg-(--color-primary) text-white'
                  : 'bg-(--color-bg) text-(--color-text-secondary) hover:text-(--color-text)'"
              >
                {{ f.label }}
              </button>
            </div>
          </div>

          <!-- 质量精度 -->
          <div v-if="options.format !== 'image/png'">
            <label class="text-sm text-(--color-text-secondary) mb-1.5 block">
              质量精度：{{ Math.round(options.quality * 100) }}%
            </label>
            <input
              type="range"
              v-model.number="options.quality"
              min="0.1"
              max="1"
              step="0.05"
              class="w-full accent-(--color-primary)"
            />
          </div>

          <!-- 缩放比例 -->
          <div>
            <label class="text-sm text-(--color-text-secondary) mb-1.5 block">缩放比例</label>
            <div class="flex gap-2">
              <button
                v-for="s in scaleOptions"
                :key="s.value"
                @click="options.scale = s.value"
                class="px-3 py-1.5 text-sm rounded-md transition-all"
                :class="options.scale === s.value
                  ? 'bg-(--color-primary) text-white'
                  : 'bg-(--color-bg) text-(--color-text-secondary) hover:text-(--color-text)'"
              >
                {{ s.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：输出区 -->
      <div class="space-y-3">
        <!-- 编码模式的输出 -->
        <template v-if="inputMode !== 'decode'">
          <div v-if="loading" class="flex items-center justify-center h-40 text-(--color-text-secondary) text-base">
            转换中...
          </div>

          <div
            v-else-if="error"
            class="p-4 rounded-xl border text-sm sm:text-base"
            style="background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger-text);"
          >
            {{ error }}
          </div>

          <template v-else-if="result">
            <!-- 预览（仅图片） -->
            <div v-if="result.isImage" class="p-4 rounded-xl border border-(--color-border) bg-(--color-surface)">
              <h3 class="text-base font-semibold text-(--color-text) mb-3">预览</h3>
              <div class="flex items-center justify-center p-4 rounded-lg bg-(--color-bg) min-h-[120px]"
                style="background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22><rect width=%2210%22 height=%2210%22 fill=%22%23f0f0f0%22/><rect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23f0f0f0%22/></svg>'); background-size: 20px 20px;">
                <img :src="result.base64" alt="preview" class="max-w-full max-h-64 object-contain" />
              </div>
            </div>

            <!-- 文件信息（非图片） -->
            <div v-else class="p-4 rounded-xl border border-(--color-border) bg-(--color-surface)">
              <h3 class="text-base font-semibold text-(--color-text) mb-3">文件信息</h3>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-(--color-text-secondary)">文件名：</span>
                  <span class="text-sm font-medium">{{ result.fileName }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-(--color-text-secondary)">类型：</span>
                  <span class="text-sm font-medium">{{ result.mimeType }}</span>
                </div>
              </div>
            </div>

            <!-- 信息 -->
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-lg border border-(--color-border) bg-(--color-surface)">
                <div class="text-sm text-(--color-text-secondary)">原始大小</div>
                <div class="text-base font-semibold mt-0.5">{{ formattedOriginalSize }}</div>
              </div>
              <div class="p-3 rounded-lg border border-(--color-border) bg-(--color-surface)">
                <div class="text-sm text-(--color-text-secondary)">编码后大小</div>
                <div class="text-base font-semibold mt-0.5">{{ formattedEncodedSize }}</div>
              </div>
              <div v-if="result.width" class="p-3 rounded-lg border border-(--color-border) bg-(--color-surface)">
                <div class="text-sm text-(--color-text-secondary)">尺寸</div>
                <div class="text-base font-semibold mt-0.5">{{ result.width }} × {{ result.height }}</div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex flex-wrap gap-2">
              <CopyButton :text="result.base64" label="复制 Base64" />
              <CopyButton v-if="result.isImage" :text="imgTag" label="复制 <img> 标签" />
              <CopyButton v-if="result.isImage" :text="cssBg" label="复制 CSS 背景" />
              <button
                @click="downloadAsText"
                class="px-3 py-1.5 text-sm sm:text-base rounded-lg border border-(--color-border) text-(--color-text-secondary) hover:border-(--color-primary) hover:text-(--color-primary) transition-colors"
              >
                下载为文本
              </button>
            </div>

            <!-- Base64 文本 -->
            <div class="p-4 rounded-xl border border-(--color-border) bg-(--color-surface)">
              <h3 class="text-base font-semibold text-(--color-text) mb-2">Base64 编码</h3>
              <pre class="text-sm font-mono break-all whitespace-pre-wrap max-h-44 overflow-y-auto text-(--color-text-secondary) leading-relaxed">{{ result.base64 }}</pre>
            </div>
          </template>

          <div v-else class="flex flex-col items-center justify-center h-40 text-(--color-text-secondary) text-sm sm:text-base">
            <span class="text-3xl mb-2">⬅️</span>
            上传任意文件或输入 SVG 代码后查看结果
          </div>
        </template>

        <!-- 解码模式的输出 -->
        <template v-else>
          <div v-if="decodeLoading" class="flex items-center justify-center h-40 text-(--color-text-secondary) text-base">
            解码中...
          </div>

          <div
            v-else-if="decodeError"
            class="p-4 rounded-xl border text-sm sm:text-base"
            style="background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger-text);"
          >
            {{ decodeError.message }}
          </div>

          <template v-else-if="decodeResult">
            <!-- 预览（仅图片） -->
            <div v-if="decodeResult.isImage" class="p-4 rounded-xl border border-(--color-border) bg-(--color-surface)">
              <h3 class="text-base font-semibold text-(--color-text) mb-3">预览</h3>
              <div class="flex items-center justify-center p-4 rounded-lg bg-(--color-bg) min-h-[120px]"
                style="background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22><rect width=%2210%22 height=%2210%22 fill=%22%23f0f0f0%22/><rect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23f0f0f0%22/></svg>'); background-size: 20px 20px;">
                <img :src="decodeResult.dataUrl" alt="preview" class="max-w-full max-h-64 object-contain" />
              </div>
              <div v-if="decodeImageDimensions" class="mt-2 text-sm text-(--color-text-secondary) text-center">
                {{ decodeImageDimensions.width }} × {{ decodeImageDimensions.height }}
              </div>
            </div>

            <!-- 文件信息 -->
            <div class="p-4 rounded-xl border border-(--color-border) bg-(--color-surface)">
              <h3 class="text-base font-semibold text-(--color-text) mb-3">文件信息</h3>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-(--color-text-secondary)">文件名：</span>
                  <span class="text-sm font-medium">{{ decodeResult.fileName }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-(--color-text-secondary)">类型：</span>
                  <span class="text-sm font-medium">{{ decodeResult.mimeType }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-(--color-text-secondary)">大小：</span>
                  <span class="text-sm font-medium">{{ formatSize(decodeResult.size) }}</span>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex flex-wrap gap-2">
              <button
                @click="downloadDecoded"
                class="px-4 py-2 text-sm sm:text-base rounded-lg bg-(--color-primary) text-white hover:bg-(--color-primary-hover) transition-colors"
              >
                下载文件
              </button>
              <CopyButton v-if="decodeResult.isImage" :text="`<img src=&quot;${decodeResult.dataUrl}&quot; alt=&quot;&quot; />`" label="复制 <img> 标签" />
              <CopyButton v-if="decodeResult.isImage" :text="`background-image: url(${decodeResult.dataUrl});`" label="复制 CSS 背景" />
            </div>
          </template>

          <div v-else class="flex flex-col items-center justify-center h-40 text-(--color-text-secondary) text-sm sm:text-base">
            <span class="text-3xl mb-2">⬅️</span>
            粘贴 Base64 字符串后点击解码
          </div>
        </template>
      </div>
    </div>
  </ToolLayout>
</template>
