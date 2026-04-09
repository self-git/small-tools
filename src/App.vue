<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isDark = ref(false)
const toolMenus = [
  { name: '图片转 Base64', route: '/base64' },
  { name: 'JSON 智能解析', route: '/json-parser' },
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
    <header class="sticky top-0 z-50 backdrop-blur-md bg-[var(--color-surface)]/90 border-b border-[var(--color-border)]">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        <div class="flex items-center justify-between gap-3">
          <router-link to="/base64" class="text-lg sm:text-xl font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">
            🧰 前端小工具集
          </router-link>
          <button
            @click="toggleTheme"
            class="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-[var(--color-border)] transition-colors text-xl"
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
            class="shrink-0 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm sm:text-base text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"
            active-class="bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
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
