<script setup lang="ts">
const tools = [
  {
    name: '图片 / SVG → Base64',
    desc: '上传图片或粘贴 SVG 代码，转换为 Base64 编码，支持调整格式、质量和尺寸',
    icon: '🖼️',
    route: '/base64',
    tags: ['图片', 'SVG', 'Base64', 'Canvas'],
  },
  {
    name: 'JSON.stringify 智能解析',
    desc: '自动检测并递归解析多层 JSON.stringify 数据，深度遍历嵌套字段',
    icon: '🔍',
    route: '/json-parser',
    tags: ['JSON', '解析', '格式化'],
  },
]
</script>

<template>
  <div>
    <div class="text-center mb-10">
      <h1 class="text-3xl font-bold text-(--color-text)">小工具集</h1>
      <p class="mt-2 text-(--color-text-secondary)">日常开发中常用的效率工具，纯浏览器本地处理</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
      <router-link
        v-for="tool in tools"
        :key="tool.route"
        :to="tool.route"
        class="group p-6 rounded-2xl border border-(--color-border) bg-(--color-surface) hover:border-(--color-primary) hover:shadow-lg hover:shadow-(--color-primary)/5 transition-all duration-300"
      >
        <div class="text-4xl mb-4">{{ tool.icon }}</div>
        <h2 class="text-lg font-semibold text-(--color-text) group-hover:text-(--color-primary) transition-colors">
          {{ tool.name }}
        </h2>
        <p class="mt-1.5 text-sm text-(--color-text-secondary) leading-relaxed">{{ tool.desc }}</p>
        <div class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="tag in tool.tags"
            :key="tag"
            class="px-2 py-0.5 text-xs rounded-md bg-(--color-bg) text-(--color-text-secondary)"
          >
            {{ tag }}
          </span>
        </div>
      </router-link>
    </div>
  </div>
</template>
