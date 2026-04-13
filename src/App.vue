<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isDark = ref(false)
const toolMenus = [
  { name: '图片转 Base64', route: '/base64' },
  { name: 'JSON 智能解析', route: '/json-parser' },
  { name: 'AI聊天解析', route: '/chat-preview' },
] as const

onMounted(() => {
  isDark.value = localStorage.getItem('theme') === 'dark'
  applyTheme()
})

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  applyTheme()
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', isDark.value)
}
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-50 backdrop-blur-md bg-(--color-surface)/90 border-b border-(--color-border)">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        <div class="flex items-center justify-between gap-3">
          <router-link
            to="/base64"
            class="text-lg sm:text-xl font-semibold text-(--color-text) cursor-pointer no-underline"
          >
            🧰 小工具集
          </router-link>
          <button
            type="button"
            @click="toggleTheme"
            class="w-10 h-10 rounded-lg flex items-center justify-center text-(--color-text) text-xl transition-colors hover:bg-(--color-text)/10 dark:hover:bg-(--color-text)/15"
            :title="isDark ? '切换亮色' : '切换暗色'"
          >
            {{ isDark ? '☀️' : '🌙' }}
          </button>
        </div>

        <nav class="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <router-link
            v-for="menu in toolMenus"
            :key="menu.route"
            :to="menu.route"
            class="shrink-0 px-4 py-2 rounded-lg border border-(--color-border) text-sm sm:text-base text-(--color-text-secondary) hover:text-(--color-primary) hover:border-(--color-primary) transition-colors"
            active-class="bg-(--color-primary) text-white border-(--color-primary)"
          >
            {{ menu.name }}
          </router-link>
        </nav>
      </div>
    </header>
    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
      <router-view />
    </main>
  </div>
</template>
