<script setup lang="ts">
import { ref, watch } from 'vue'
import ToolLayout from '@/components/ToolLayout.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import CopyButton from '@/components/CopyButton.vue'
import { useBase64 } from '@/composables/useBase64'
import type { ImageFormat } from '@/composables/useBase64'

const {
  result, loading, error, options, sourceType,
  formattedOriginalSize, formattedEncodedSize, imgTag, cssBg,
  convertFile, convertSvgCode, reconvert, reset,
} = useBase64()

/** 输入模式切换 */
const inputMode = ref<'file' | 'svg'>('file')
const svgInput = ref('')

function onFile(file: File) {
  reset()
  convertFile(file)
}

function onSvgConvert() {
  if (!svgInput.value.trim()) return
  reset()
  convertSvgCode(svgInput.value)
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
  <ToolLayout title="图片 / SVG → Base64" desc="上传图片、粘贴截图或输入 SVG 代码，转换为 Base64 编码，支持调整格式、质量和尺寸">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <!-- 左侧：输入区 -->
      <div class="space-y-3">
        <!-- 模式切换 -->
        <div class="flex gap-2">
          <button
            v-for="m in ([{ key: 'file', label: '📷 文件上传' }, { key: 'svg', label: '📝 SVG 代码' }] as const)"
            :key="m.key"
            @click="inputMode = m.key"
            class="px-4 py-2 text-sm sm:text-base rounded-lg transition-all"
            :class="inputMode === m.key
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-primary)]'"
          >
            {{ m.label }}
          </button>
        </div>

        <!-- 文件上传 -->
        <FileDropZone
          v-if="inputMode === 'file'"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          @file="onFile"
        />

        <!-- SVG 代码输入 -->
        <div v-else class="space-y-3">
          <textarea
            v-model="svgInput"
            placeholder="在此粘贴 SVG 代码，例如：&#10;<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 100 100&quot;>&#10;  <circle cx=&quot;50&quot; cy=&quot;50&quot; r=&quot;40&quot; fill=&quot;#6366f1&quot;/>&#10;</svg>"
            class="w-full h-44 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm sm:text-base font-mono resize-y focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
          <button
            @click="onSvgConvert"
            class="px-4 py-2 text-sm sm:text-base rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            转换
          </button>
        </div>

        <!-- 转换选项（仅文件模式） -->
        <div v-if="sourceType === 'file'" class="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
          <h3 class="text-base font-semibold text-[var(--color-text)]">转换选项</h3>

          <!-- 输出格式 -->
          <div>
            <label class="text-sm text-[var(--color-text-secondary)] mb-1.5 block">输出格式</label>
            <div class="flex gap-2">
              <button
                v-for="f in formatOptions"
                :key="f.value"
                @click="options.format = f.value"
                class="px-3 py-1.5 text-sm rounded-md transition-all"
                :class="options.format === f.value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'"
              >
                {{ f.label }}
              </button>
            </div>
          </div>

          <!-- 质量精度 -->
          <div v-if="options.format !== 'image/png'">
            <label class="text-sm text-[var(--color-text-secondary)] mb-1.5 block">
              质量精度：{{ Math.round(options.quality * 100) }}%
            </label>
            <input
              type="range"
              v-model.number="options.quality"
              min="0.1"
              max="1"
              step="0.05"
              class="w-full accent-[var(--color-primary)]"
            />
          </div>

          <!-- 缩放比例 -->
          <div>
            <label class="text-sm text-[var(--color-text-secondary)] mb-1.5 block">缩放比例</label>
            <div class="flex gap-2">
              <button
                v-for="s in scaleOptions"
                :key="s.value"
                @click="options.scale = s.value"
                class="px-3 py-1.5 text-sm rounded-md transition-all"
                :class="options.scale === s.value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'"
              >
                {{ s.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：输出区 -->
      <div class="space-y-3">
        <div v-if="loading" class="flex items-center justify-center h-40 text-[var(--color-text-secondary)] text-base">
          转换中...
        </div>

        <div v-else-if="error" class="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm sm:text-base">
          {{ error }}
        </div>

        <template v-else-if="result">
          <!-- 预览 -->
          <div class="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <h3 class="text-base font-semibold text-[var(--color-text)] mb-3">预览</h3>
            <div class="flex items-center justify-center p-4 rounded-lg bg-[var(--color-bg)] min-h-[120px]"
              style="background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22><rect width=%2210%22 height=%2210%22 fill=%22%23f0f0f0%22/><rect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23f0f0f0%22/></svg>'); background-size: 20px 20px;">
              <img :src="result.base64" alt="preview" class="max-w-full max-h-64 object-contain" />
            </div>
          </div>

          <!-- 信息 -->
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div class="text-sm text-[var(--color-text-secondary)]">原始大小</div>
              <div class="text-base font-semibold mt-0.5">{{ formattedOriginalSize }}</div>
            </div>
            <div class="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div class="text-sm text-[var(--color-text-secondary)]">编码后大小</div>
              <div class="text-base font-semibold mt-0.5">{{ formattedEncodedSize }}</div>
            </div>
            <div v-if="result.width" class="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div class="text-sm text-[var(--color-text-secondary)]">尺寸</div>
              <div class="text-base font-semibold mt-0.5">{{ result.width }} × {{ result.height }}</div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex flex-wrap gap-2">
            <CopyButton :text="result.base64" label="复制 Base64" />
            <CopyButton :text="imgTag" label="复制 <img> 标签" />
            <CopyButton :text="cssBg" label="复制 CSS 背景" />
            <button
              @click="downloadAsText"
              class="px-3 py-1.5 text-sm sm:text-base rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              下载为文本
            </button>
          </div>

          <!-- Base64 文本 -->
          <div class="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <h3 class="text-base font-semibold text-[var(--color-text)] mb-2">Base64 编码</h3>
            <pre class="text-sm font-mono break-all whitespace-pre-wrap max-h-44 overflow-y-auto text-[var(--color-text-secondary)] leading-relaxed">{{ result.base64 }}</pre>
          </div>
        </template>

        <div v-else class="flex flex-col items-center justify-center h-40 text-[var(--color-text-secondary)] text-sm sm:text-base">
          <span class="text-3xl mb-2">⬅️</span>
          上传图片、粘贴截图或输入 SVG 后查看结果
        </div>
      </div>
    </div>
  </ToolLayout>
</template>
