# State Management

> How state is managed in this project.

---

## Overview

This project uses **Vue 3's built-in reactivity system** for state management. There is no external state library (no Pinia, no Vuex).

### State Architecture

| State Type | Location | Scope |
|------------|----------|-------|
| **Component state** | `ref()` in components | Single component |
| **Composable state** | `ref()` in composables | Shared via composable |
| **Global state** | `ref()` in composables | App-wide (via provide/inject) |

---

## State Architecture

### State Flow

```
Component A → useMyComposable() → shared state
Component B → useMyComposable() → same shared state
```

### When to Use Each Type

| Use Case | Solution |
|----------|----------|
| Simple component state | `ref()` in `<script setup>` |
| Shared state between components | Composable with `ref()` |
| Complex app-wide state | Composable with provide/inject |
| Persistent state | `localStorage` + `ref()` |

---

## Local State

### Component-Level State

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

// Simple state
const count = ref(0)

// Computed derived state
const doubleCount = computed(() => count.value * 2)

// Methods
function increment() {
  count.value++
}
</script>
```

### Best Practices

- Use `ref()` for primitive values (string, number, boolean)
- Use `reactive()` for objects (but prefer `ref()` for simplicity)
- Use `computed()` for derived state
- Keep state close to where it's used

---

## Global State

### Pattern: Shared Composable

Create a composable that manages shared state:

```typescript
// src/composables/useGlobalState.ts
import { ref } from 'vue'

// State defined outside function = shared singleton
const isDark = ref(false)
const user = ref<User | null>(null)

export function useGlobalState() {
  function toggleTheme() {
    isDark.value = !isDark.value
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }

  function setUser(newUser: User) {
    user.value = newUser
  }

  return {
    isDark,
    user,
    toggleTheme,
    setUser,
  }
}
```

### Usage in Components

```vue
<script setup lang="ts">
import { useGlobalState } from '@/composables/useGlobalState'

const { isDark, toggleTheme } = useGlobalState()
</script>
```

### Pattern: Provide/Inject

For truly global state that needs to be available everywhere:

```typescript
// src/composables/useTheme.ts
import { ref, provide, inject } from 'vue'

const THEME_KEY = Symbol('theme')

export function provideTheme() {
  const isDark = ref(false)
  provide(THEME_KEY, { isDark })
}

export function useTheme() {
  const theme = inject(THEME_KEY)
  if (!theme) throw new Error('Theme not provided')
  return theme
}
```

---

## Async State

### Pattern: Loading/Error States

```typescript
export function useAsyncData<T>() {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function execute(asyncFn: () => Promise<T>) {
    loading.value = true
    error.value = null
    try {
      data.value = await asyncFn()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed'
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
```

### Usage

```vue
<script setup lang="ts">
import { useAsyncData } from '@/composables/useAsyncData'

const { data, loading, error, execute } = useAsyncData<string>()

async function fetchData() {
  await execute(async () => {
    const res = await fetch('/api/data')
    return res.text()
  })
}
</script>
```

---

## Persistent State

### Pattern: localStorage with Ref

```typescript
export function usePersistedState<T>(key: string, defaultValue: T) {
  const stored = localStorage.getItem(key)
  const state = ref<T>(stored ? JSON.parse(stored) : defaultValue)

  // Watch for changes and persist
  watch(state, (newValue) => {
    localStorage.setItem(key, JSON.stringify(newValue))
  }, { deep: true })

  return state
}
```

### Example: Theme Persistence

```typescript
// In App.vue
const isDark = ref(localStorage.getItem('theme') === 'dark')

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  document.documentElement.classList.toggle('dark', isDark.value)
}
```

---

## Common Mistakes

### ❌ Don't: Mutate Refs Incorrectly

```typescript
// Bad
const state = ref({ count: 0 })
state.count++  // Wrong! Missing .value

// Good
const state = ref({ count: 0 })
state.value.count++
```

### ❌ Don't: Create New Refs in Composables Each Call

```typescript
// Bad: creates new state each time
export function useBad() {
  const count = ref(0)  // New instance every call!
  return { count }
}

// Good: shared state
const count = ref(0)  // Module-level singleton
export function useGood() {
  return { count }
}
```

### ✅ Do: Use TypeScript for State

```typescript
// Good: typed state
interface User {
  id: number
  name: string
  email: string
}

const user = ref<User | null>(null)
```

---

## Examples

### State Patterns in This Project

- **Theme state**: `App.vue` uses `ref()` + `localStorage` for theme persistence
- **Tool state**: Each composable (`useBase64`, `useJsonParse`) manages its own state
- **Loading state**: Async operations track `loading` and `error` states

### Key Takeaways

1. **No external library needed** for most apps
2. **Composables are the answer** to shared state
3. **Keep state close** to where it's used
4. **Use TypeScript** for type safety
5. **Persist important state** to localStorage

---

## State Categories

<!-- Local state, global state, server state, URL state -->

(To be filled by the team)

---

## When to Use Global State

<!-- Criteria for promoting state to global -->

(To be filled by the team)

---

## Server State

<!-- How server data is cached and synchronized -->

(To be filled by the team)

---

## Common Mistakes

<!-- State management mistakes your team has made -->

(To be filled by the team)
