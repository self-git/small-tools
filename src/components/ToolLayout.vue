<script setup lang="ts">
defineProps<{
  title: string
  desc?: string
}>()
</script>

<template>
  <div>
    <div class="mb-5 sm:mb-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-[var(--color-text)]">{{ title }}</h1>
      <p v-if="desc" class="mt-1.5 text-sm sm:text-base text-[var(--color-text-secondary)]">{{ desc }}</p>
    </div>
    <slot />
  </div>
</template>
