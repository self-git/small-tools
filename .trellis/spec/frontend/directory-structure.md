# Directory Structure

> How frontend code is organized in this project.

---

## Overview

This is a Vue 3 + TypeScript + Tailwind CSS toolkit project with the following structure:

- **Components**: Reusable UI components in `src/components/`
- **Views**: Page-level components in `src/views/`
- **Composables**: Reusable logic in `src/composables/`
- **Router**: Vue Router configuration in `src/router/`

---

## Directory Layout

```
src/
├── App.vue              # Root component with theme toggle and navigation
├── main.ts              # Application entry point
├── assets/              # Static assets (CSS, images)
│   └── main.css         # Global styles
├── components/          # Reusable UI components
│   ├── CopyButton.vue   # Copy-to-clipboard button
│   ├── FileDropZone.vue # File drag-and-drop zone
│   └── ToolLayout.vue   # Common layout wrapper for tools
├── composables/         # Vue 3 composables (reusable logic)
│   ├── useBase64.ts     # Base64 encoding/decoding logic
│   ├── useJsonParse.ts  # JSON parsing logic
│   ├── useSseChatPreview.ts    # SSE chat preview logic
│   └── useSseWorkflowPreview.ts # SSE workflow preview logic
├── router/              # Vue Router configuration
│   └── index.ts         # Route definitions
└── views/               # Page-level components
    ├── Base64Tool.vue   # Base64 conversion tool
    ├── JsonParser.vue   # JSON parsing tool
    ├── ChatPreview.vue  # Chat preview tool
    └── WorkflowPreview.vue # Workflow preview tool
```

---

## Module Organization

### Adding a New Tool

1. Create a new view in `src/views/` (e.g., `NewTool.vue`)
2. Create a composable in `src/composables/` if needed (e.g., `useNewTool.ts`)
3. Add route in `src/router/index.ts`
4. Add menu entry in `App.vue` `toolMenus` array

### Component Structure

- **Views**: Full-page components that represent a route
- **Components**: Reusable UI pieces used across views
- **Composables**: Stateless logic that can be shared between components

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| View components | PascalCase, descriptive | `Base64Tool.vue`, `JsonParser.vue` |
| Reusable components | PascalCase, generic | `CopyButton.vue`, `ToolLayout.vue` |
| Composables | `use` prefix, camelCase | `useBase64.ts`, `useJsonParse.ts` |
| Router files | `index.ts` in `router/` directory | `src/router/index.ts` |
| Assets | lowercase, descriptive | `main.css` |

---

## Examples

### Well-Organized Tool Implementation

See `src/views/Base64Tool.vue` + `src/composables/useBase64.ts` for a complete example of:
- View component with UI layout
- Composable with business logic
- Proper TypeScript typing
- Error handling patterns
