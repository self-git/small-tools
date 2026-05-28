# Component Guidelines

> How components are built in this project.

---

## Overview

This project uses Vue 3 with `<script setup>` syntax and TypeScript. Components follow these patterns:

- **Composition API**: All components use `<script setup lang="ts">`
- **TypeScript props**: Props are defined with `defineProps<{}>()`
- **Emits**: Events are defined with `defineEmits<{}>()`
- **Tailwind CSS**: Styling uses Tailwind CSS classes with CSS custom properties

---

## Component Structure

### Standard Component Template

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

// Props with TypeScript types
const props = defineProps<{
  title: string
  desc?: string
}>()

// Emits with type safety
const emit = defineEmits<{
  submit: [data: FormData]
}>()

// Local state
const isOpen = ref(false)

// Computed properties
const formattedTitle = computed(() => props.title.toUpperCase())

// Methods
function handleSubmit() {
  emit('submit', new FormData())
}
</script>

<template>
  <div>
    <h1>{{ formattedTitle }}</h1>
    <slot />
  </div>
</template>
```

### File Organization

- **One component per file**
- **Script setup at the top**
- **Template at the bottom**
- **No separate style block** (use Tailwind classes)

---

## Props Conventions

### Type-Only Props

```vue
<script setup lang="ts">
const props = defineProps<{
  title: string
  count?: number
  items: string[]
}>()
</script>
```

### Props with Defaults

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  accept?: string
  enablePaste?: boolean
}>(), {
  accept: '*/*',
  enablePaste: true,
})
</script>
```

### Props Naming

- Use **camelCase** for prop names in TypeScript
- Use **kebab-case** in templates when passing props
- Prefix boolean props with `is` or `enable` (e.g., `isVisible`, `enablePaste`)

---

## Styling Patterns

### Tailwind CSS with CSS Custom Properties

This project uses Tailwind CSS with custom properties for theming:

```vue
<template>
  <div class="bg-(--color-surface) text-(--color-text) border-(--color-border)">
    <!-- Content -->
  </div>
</template>
```

### Common Styling Patterns

| Pattern | Example |
|---------|---------|
| Background | `bg-(--color-surface)` |
| Text | `text-(--color-text)` |
| Border | `border-(--color-border)` |
| Primary | `bg-(--color-primary) text-white` |
| Hover | `hover:bg-(--color-primary-hover)` |
| Dark mode | `dark:bg-(--color-surface-dark)` |

### Responsive Design

Use Tailwind responsive prefixes:

```vue
<template>
  <div class="text-sm sm:text-base md:text-lg">
    Responsive text
  </div>
</template>
```

---

## Accessibility

### Required Patterns

- **Click targets**: Use `@click` on interactive elements, not just `div`
- **Focus management**: Add `tabindex="0"` for custom interactive elements
- **Keyboard support**: Handle `@keydown.enter` and `@keydown.space` for custom buttons
- **ARIA labels**: Add `aria-label` for icon-only buttons

### Example

```vue
<template>
  <div
    @click="handleClick"
    @keydown.enter="handleClick"
    tabindex="0"
    role="button"
    aria-label="Upload file"
  >
    📁 Upload
  </div>
</template>
```

---

## Common Mistakes

### ❌ Don't

```vue
<script setup lang="ts">
// Don't use Options API
export default {
  data() {
    return { count: 0 }
  }
}
</script>
```

### ✅ Do

```vue
<script setup lang="ts">
// Use Composition API with script setup
const count = ref(0)
</script>
```

### ❌ Don't

```vue
<template>
  <!-- Don't use inline styles -->
  <div style="color: red; font-size: 16px;">Text</div>
</template>
```

### ✅ Do

```vue
<template>
  <!-- Use Tailwind classes -->
  <div class="text-red-500 text-base">Text</div>
</template>
```

---

## Examples

### Well-Structured Components

- `src/components/ToolLayout.vue` - Simple layout component with props and slots
- `src/components/CopyButton.vue` - Interactive button with state management
- `src/components/FileDropZone.vue` - Complex component with events and lifecycle hooks
