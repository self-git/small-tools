# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

This directory contains guidelines for frontend development in this Vue 3 + TypeScript + Tailwind CSS project. These guidelines help AI assistants and new team members understand how this project works.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | ✅ Filled |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | ✅ Filled |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | ✅ Filled |
| [State Management](./state-management.md) | Local state, global state, server state | ✅ Filled |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | ✅ Filled |
| [Type Safety](./type-safety.md) | Type patterns, validation | ✅ Filled |

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Vue 3 | UI framework with Composition API |
| TypeScript | Type-safe JavaScript |
| Tailwind CSS | Utility-first CSS framework |
| Vite | Build tool and dev server |
| Vue Router | Client-side routing |

---

## Quick Reference

### Adding a New Tool

1. Create view in `src/views/` (e.g., `NewTool.vue`)
2. Create composable in `src/composables/` if needed (e.g., `useNewTool.ts`)
3. Add route in `src/router/index.ts`
4. Add menu entry in `App.vue` `toolMenus` array

### Component Pattern

```vue
<script setup lang="ts">
const props = defineProps<{
  title: string
}>()
</script>

<template>
  <div>{{ title }}</div>
</template>
```

### Composable Pattern

```typescript
import { ref, computed } from 'vue'

export interface MyResult {
  data: string
}

export function useMyFeature() {
  const result = ref<MyResult | null>(null)
  const loading = ref(false)

  function reset() {
    result.value = null
  }

  return { result, loading, reset }
}
```

---

**Language**: All documentation is written in **English**.
