# Hook Guidelines

> How hooks are used in this project.

---

## Overview

This project uses Vue 3 **Composables** (not React hooks). Composables are functions that encapsulate reactive state and logic, following the `use*` naming convention.

### Key Patterns

- **State management**: Use `ref()` and `computed()` for reactive state
- **Encapsulation**: Keep related logic together in one composable
- **Reusability**: Composables can be used across multiple components
- **Type safety**: Full TypeScript support with exported interfaces

---

## Custom Hook Patterns

### Standard Composable Structure

```typescript
import { ref, computed } from 'vue'

// Export interfaces for type safety
export interface MyResult {
  data: string
  timestamp: number
}

export function useMyFeature() {
  // 1. Reactive state
  const result = ref<MyResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 2. Computed properties
  const hasResult = computed(() => result.value !== null)

  // 3. Methods
  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      // Implementation
      result.value = { data: 'example', timestamp: Date.now() }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  // 4. Reset function
  function reset() {
    result.value = null
    error.value = null
  }

  // 5. Return public API
  return {
    result,
    loading,
    error,
    hasResult,
    fetchData,
    reset,
  }
}
```

### Composable with Options

```typescript
export interface UseBase64Options {
  format: 'image/png' | 'image/jpeg' | 'image/webp'
  quality: number
  scale: number
}

export function useBase64(options?: Partial<UseBase64Options>) {
  const defaultOptions: UseBase64Options = {
    format: 'image/png',
    quality: 0.92,
    scale: 1,
  }

  const mergedOptions = { ...defaultOptions, ...options }
  // Use mergedOptions...
}
```

---

## Data Fetching

### Pattern: Async Operations

```typescript
export function useAsyncOperation<T>() {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function execute(operation: () => Promise<T>) {
    loading.value = true
    error.value = null
    try {
      data.value = await operation()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Operation failed'
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
```

### Usage in Component

```vue
<script setup lang="ts">
import { useAsyncOperation } from '@/composables/useAsyncOperation'

const { data, loading, error, execute } = useAsyncOperation<string>()

async function handleSubmit() {
  await execute(async () => {
    const response = await fetch('/api/data')
    return response.text()
  })
}
</script>
```

---

## Naming Conventions

| Pattern | Convention | Example |
|---------|------------|---------|
| Composable functions | `use` prefix, camelCase | `useBase64`, `useJsonParse` |
| Exported interfaces | PascalCase, descriptive | `Base64Result`, `ParseLayer` |
| State variables | camelCase, descriptive | `loading`, `error`, `result` |
| Methods | camelCase, action verbs | `convertFile`, `parse`, `reset` |

### File Naming

- One composable per file
- File name matches function name: `useBase64.ts` exports `useBase64()`
- Place in `src/composables/` directory

---

## Common Mistakes

### ❌ Don't: Mix Reactive and Non-Reactive State

```typescript
// Bad: mixing ref and plain variables
export function useBad() {
  const count = ref(0)  // Reactive
  let total = 0         // NOT reactive!

  function increment() {
    count.value++
    total++  // Won't trigger reactivity
  }
}
```

### ✅ Do: Keep All State Reactive

```typescript
// Good: all state is reactive
export function useGood() {
  const count = ref(0)
  const total = ref(0)

  function increment() {
    count.value++
    total.value++  // Triggers reactivity
  }
}
```

### ❌ Don't: Forget Cleanup

```typescript
// Bad: no cleanup for timers or listeners
export function useTimer() {
  const timer = setInterval(() => {
    // Do something
  }, 1000)
  // Timer never cleared!
}
```

### ✅ Do: Provide Cleanup

```typescript
// Good: cleanup in reset or onUnmounted
export function useTimer() {
  let timer: number | null = null

  function start() {
    timer = setInterval(() => {
      // Do something
    }, 1000)
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  return { start, stop }
}
```

---

## Examples

### Well-Structured Composables

- `src/composables/useBase64.ts` - Complex composable with multiple methods and state
- `src/composables/useJsonParse.ts` - Composable with recursive logic and type exports
- `src/composables/useSseChatPreview.ts` - Composable handling server-sent events

### Key Takeaways

1. **Export interfaces** for type safety
2. **Provide reset()** to clear state
3. **Handle errors** gracefully
4. **Use computed()** for derived state
5. **Keep functions pure** when possible

---

## Custom Hook Patterns

<!-- How to create and structure custom hooks -->

(To be filled by the team)

---

## Data Fetching

<!-- How data fetching is handled (React Query, SWR, etc.) -->

(To be filled by the team)

---

## Naming Conventions

<!-- Hook naming rules (use*, etc.) -->

(To be filled by the team)

---

## Common Mistakes

<!-- Hook-related mistakes your team has made -->

(To be filled by the team)
