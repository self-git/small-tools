# Type Safety

> TypeScript conventions for this project.

---

## Overview

This project uses **strict TypeScript** with Vue 3. All code must be properly typed.

### Key Principles

- **Strict mode enabled** (`"strict": true` in tsconfig)
- **No unused variables/parameters** (enforced by linter)
- **Type-only imports** when possible
- **Export interfaces** from composables for reuse

---

## TypeScript Configuration

### Compiler Options

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "isolatedModules": true
  }
}
```

### Path Aliases

```json
{
  "paths": {
    "@/*": ["src/*"]
  }
}
```

Usage: `import { useBase64 } from '@/composables/useBase64'`

---

## Type Patterns

### Interface Definitions

```typescript
// Export interfaces for reuse
export interface Base64Result {
  base64: string
  originalSize: number
  encodedSize: number
  width: number
  height: number
  isImage: boolean
  fileName: string
  mimeType: string
}

// Use interface for function parameters
function processResult(result: Base64Result) {
  // Implementation
}
```

### Type Aliases

```typescript
// For unions and simple types
export type ImageFormat = 'image/png' | 'image/jpeg' | 'image/webp'
export type ThemeMode = 'light' | 'dark'
```

### Generic Types

```typescript
// Generic composable
export function useAsyncData<T>() {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  // ...
}

// Usage
const { data } = useAsyncData<User[]>()
```

---

## Vue-Specific Types

### Props with TypeScript

```vue
<script setup lang="ts">
// Type-only props (preferred)
const props = defineProps<{
  title: string
  count?: number
  items: string[]
}>()

// Props with defaults
const props = withDefaults(defineProps<{
  title: string
  count?: number
}>(), {
  count: 0,
})
</script>
```

### Emits with TypeScript

```vue
<script setup lang="ts">
// Type-only emits
const emit = defineEmits<{
  submit: [data: FormData]
  change: [value: string]
  'update:modelValue': [value: string]
}>()

// Usage
emit('submit', formData)
</script>
```

### Ref Types

```vue
<script setup lang="ts">
import { ref } from 'vue'

// Explicit type
const count = ref<number>(0)
const user = ref<User | null>(null)

// Inferred type
const name = ref('hello')  // inferred as Ref<string>
</script>
```

### Computed Types

```vue
<script setup lang="ts">
import { computed } from 'vue'

// Explicit return type
const fullName = computed<string>(() => {
  return `${firstName.value} ${lastName.value}`
})

// Inferred type
const doubleCount = computed(() => count.value * 2)
</script>
```

---

## API Response Types

### Pattern: API Types

```typescript
// src/types/api.ts
export interface ApiResponse<T> {
  data: T
  status: number
  message: string
}

export interface User {
  id: number
  name: string
  email: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
```

### Usage with Fetch

```typescript
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  const data: ApiResponse<User> = await response.json()
  return data.data
}
```

---

## Common Mistakes

### ❌ Don't: Use `any`

```typescript
// Bad
function process(data: any) {
  // No type safety
}

// Good
function process(data: unknown) {
  // Must check type before use
  if (typeof data === 'string') {
    // ...
  }
}
```

### ❌ Don't: Forget Type Exports

```typescript
// Bad: interface not exported
interface User {
  id: number
  name: string
}

// Good: export for reuse
export interface User {
  id: number
  name: string
}
```

### ❌ Don't: Use Type Assertions Unnecessarily

```typescript
// Bad
const user = {} as User

// Good
const user: User = {
  id: 1,
  name: 'John',
}
```

### ✅ Do: Use Type Guards

```typescript
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj
  )
}

// Usage
if (isUser(data)) {
  console.log(data.name)  // TypeScript knows data is User
}
```

---

## Examples

### Type Patterns in This Project

- **Exported interfaces**: `useBase64.ts` exports `Base64Result`, `Base64Options`
- **Type-only imports**: `import type { Base64Result } from './useBase64'`
- **Generic composables**: `useAsyncData<T>()` pattern
- **Strict null checks**: All refs properly typed with `| null`

### Key Takeaways

1. **Always export interfaces** from composables
2. **Use strict mode** - don't disable it
3. **Prefer type-only imports** when possible
4. **Avoid `any`** - use `unknown` instead
5. **Use generic types** for reusable composables

---

## Type Organization

<!-- Where types are defined, shared types vs local types -->

(To be filled by the team)

---

## Validation

<!-- Runtime validation patterns (Zod, Yup, io-ts, etc.) -->

(To be filled by the team)

---

## Common Patterns

<!-- Type utilities, generics, type guards -->

(To be filled by the team)

---

## Forbidden Patterns

<!-- any, type assertions, etc. -->

(To be filled by the team)
