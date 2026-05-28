# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

This project follows these quality standards:

- **TypeScript strict mode** enabled
- **No unused variables/parameters** (enforced)
- **Consistent code style** (manual enforcement)
- **Proper error handling** required
- **Accessibility considerations** for UI components

---

## Forbidden Patterns

### ❌ Don't Use

| Pattern | Reason |
|---------|--------|
| `any` type | Loses type safety |
| `@ts-ignore` | Hides real errors |
| `var` | Use `const`/`let` instead |
| Inline styles | Use Tailwind classes |
| `console.log` in production | Use proper logging or remove |
| Magic numbers | Use named constants |
| Deep nesting | Extract into functions/components |

### ❌ Don't: Use `any`

```typescript
// Bad
function process(data: any) {
  // No type safety
}

// Good
function process(data: unknown) {
  if (typeof data === 'string') {
    // ...
  }
}
```

### ❌ Don't: Use `@ts-ignore`

```typescript
// Bad
// @ts-ignore
const result = someFunction()

// Good: fix the type error properly
const result: ExpectedType = someFunction()
```

### ❌ Don't: Use Inline Styles

```vue
<!-- Bad -->
<template>
  <div style="color: red; font-size: 16px;">Text</div>
</template>

<!-- Good -->
<template>
  <div class="text-red-500 text-base">Text</div>
</template>
```

---

## Required Patterns

### ✅ Always Use

| Pattern | Reason |
|---------|--------|
| `<script setup>` | Vue 3 standard |
| TypeScript types | Type safety |
| Error handling | Graceful failures |
| Cleanup functions | Prevent memory leaks |
| Exported interfaces | Reusability |

### ✅ Do: Use `<script setup>`

```vue
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>
```

### ✅ Do: Handle Errors

```typescript
async function fetchData() {
  try {
    const response = await fetch('/api/data')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch data:', error)
    throw error
  }
}
```

### ✅ Do: Cleanup Resources

```typescript
export function useEventListener(target: EventTarget, event: string, handler: Function) {
  onMounted(() => target.addEventListener(event, handler))
  onBeforeUnmount(() => target.removeEventListener(event, handler))
}
```

---

## Testing Requirements

### Current Status

This project does **not** currently have tests configured. Consider adding:

- **Unit tests**: Vitest for composables and utilities
- **Component tests**: Vue Test Utils for components
- **E2E tests**: Playwright or Cypress for critical paths

### Recommended Test Structure

```
src/
├── composables/
│   └── useBase64.ts
├── composables/__tests__/
│   └── useBase64.test.ts  # Unit tests
└── components/
    └── ToolLayout.vue
```

### Test Patterns (When Added)

```typescript
// Example unit test
import { describe, it, expect } from 'vitest'
import { useBase64 } from '../useBase64'

describe('useBase64', () => {
  it('should convert file to base64', async () => {
    const { convertFile, result } = useBase64()
    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    await convertFile(file)
    expect(result.value).toBeTruthy()
  })
})
```

---

## Code Review Checklist

### Before Submitting

- [ ] No TypeScript errors (`vue-tsc --noEmit`)
- [ ] No unused variables or imports
- [ ] Proper error handling
- [ ] No `any` types
- [ ] No inline styles
- [ ] Proper cleanup in composables
- [ ] Exported interfaces for reusable types

### Component Review

- [ ] Uses `<script setup>` syntax
- [ ] Props properly typed with `defineProps<{}>()`
- [ ] Emits properly typed with `defineEmits<{}>()`
- [ ] Accessibility: keyboard support, ARIA labels
- [ ] Responsive: works on mobile and desktop

### Composable Review

- [ ] All state properly typed
- [ ] Reset function provided
- [ ] Error handling implemented
- [ ] Cleanup in `onBeforeUnmount` if needed
- [ ] Interfaces exported

---

## Code Style

### Formatting

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for TypeScript, double quotes for HTML attributes
- **Semicolons**: No semicolons (enforced by Vue convention)
- **Line length**: Max 100 characters (recommended)

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ToolLayout.vue` |
| Composables | camelCase with `use` prefix | `useBase64.ts` |
| Interfaces | PascalCase | `Base64Result` |
| Variables | camelCase | `isLoading` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |

### File Organization

```vue
<script setup lang="ts">
// 1. Imports
import { ref, computed } from 'vue'

// 2. Props & Emits
const props = defineProps<{...}>()
const emit = defineEmits<{...}>()

// 3. State
const count = ref(0)

// 4. Computed
const double = computed(() => count.value * 2)

// 5. Methods
function increment() { ... }

// 6. Lifecycle hooks
onMounted(() => { ... })
</script>

<template>
  <!-- Template -->
</template>
```

---

## Examples

### Quality Patterns in This Project

- **Error handling**: `useBase64.ts` handles file read errors gracefully
- **Type exports**: All composables export interfaces
- **Cleanup**: `FileDropZone.vue` removes event listeners in `onBeforeUnmount`
- **Accessibility**: `FileDropZone.vue` has keyboard support and ARIA labels

### Key Takeaways

1. **Strict TypeScript** - no shortcuts
2. **Proper error handling** - always catch and handle
3. **Clean up resources** - prevent memory leaks
4. **Export types** - enable reuse
5. **Accessibility first** - build inclusive UIs
