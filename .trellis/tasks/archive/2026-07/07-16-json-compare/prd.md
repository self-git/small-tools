# JSON 双份对比差异

## Goal

在独立页面 `/json-compare` 粘贴两份 JSON（A / B），手动触发对比后，快速看出结构或取值差异：路径列表扫差异、双树看上下文，纯浏览器本地处理。

## Background

- Vue 3 + Vite + Tailwind 工具集；已有 `JsonParser`（`smartParse`、vue-json-pretty、树搜索）见 `src/views/JsonParser.vue`、`src/composables/useJsonParse.ts`。
- 首页每工具一路由（`src/views/Home.vue`）；尚无 JSON diff 能力；`package.json` 无 diff 专用依赖。

## Requirements

### 页面与入口

- [R1] 新增 `src/views/JsonCompare.vue`，路由 `/json-compare`；`Home.vue` 增加工具卡片。
- [R2] 双输入区：**JSON A**、**JSON B**（大屏左右并排，小屏上下）；各含 textarea、清空；复用 JsonParser 级粘贴与 `⌘/Ctrl+Z` 回退模式（如适用）。
- [R3] **最大深度**控件，默认 `10`，对比前两侧均经 `smartParse`（ADR-3）。

### 对比触发与解析

- [R4] **仅手动对比**：「对比」按钮 + `⌘/Ctrl+Enter`（ADR-6）。
- [R5] 任一侧解析失败 → **阻断 diff**，对应输入区下方错误提示；结果区不展示列表/树（ADR-7）。

### 比较规则

- [R6] 可切换两种模式（ADR-4）：
  - **严格**（默认）：对象 key 顺序忽略；数组顺序敏感；`1` ≠ `"1"`；`null` ≠ `undefined`；缺失 ≠ `null`。
  - **宽松**：数字与数字字符串相等；数组按多重集合比较（顺序不敏感）。

### 差异展示

- [R7] **有差异时**：差异路径列表 + 并排双树（ADR-2）。
  - 列表项：路径（`a.b["中文"][0].name` 格式，ADR-11）、变更类型（仅 A 有 / 仅 B 有 / 值不同 / 类型不同）、旧值→新值展示。
  - 顶部差异总数；按类型**筛选**；**复制单条路径**、**复制完整差异报告**（ADR-8）。
  - 点击列表项 → 双树展开、滚动、高亮对应节点（ADR-5）。
  - 大屏双树左右并排；`<lg` 列表在上、A 树与 B 树纵向堆叠（ADR-10）。
- [R8] **完全相同**：提示「两份 JSON 完全相同」；列表为空；**不展示双树**（ADR-9）。
- [R9] **未对比**：结果区占位引导。

### 非功能

- [R10] 沿用现有 CSS 变量与 `ToolLayout`；`vue-tsc` / build 通过。

## Acceptance Criteria

- [ ] 首页可进入 `/json-compare`；双输入、对比按钮、规则切换、最大深度可用。
- [ ] 两侧合法 JSON 点击对比后，列表正确列出差异；严格/宽松模式切换结果符合 ADR-4。
- [ ] 类型筛选、复制路径、复制完整报告可用。
- [ ] 点击列表项可在 A/B 双树定位并高亮；桌面并排、移动堆叠布局正常。
- [ ] 完全相同仅成功提示、无列表无树；单侧解析失败阻断且就近报错。
- [ ] 非法 JSON、空输入等边界有明确提示，不崩溃。

## Out of Scope (v1)

- 交换 A/B、加载示例、自动 debounce 对比、diff 历史持久化、服务端、JSON Pointer 路径格式、正则/JSONPath 过滤、完全相同态仍展示双树。

## Decisions (ADR Summary)

| ID | Decision |
|----|----------|
| ADR-1 | 独立页面 `/json-compare` |
| ADR-2 | 路径列表 + 并排双树 |
| ADR-3 | 两侧 `smartParse` |
| ADR-4 | 严格 / 宽松 可切换 |
| ADR-5 | 列表点击 → 双树定位高亮 |
| ADR-6 | 仅手动触发对比 |
| ADR-7 | 解析失败阻断 diff |
| ADR-8 | 筛选 + 复制（路径 / 完整报告） |
| ADR-9 | 完全相同不展示双树 |
| ADR-10 | 小屏双树上下堆叠 |
| ADR-11 | 中性标签 JSON A / B；路径 `a.b["k"][0]` |

## Technical Notes

- 新增 `useJsonDiff`（或同级 composable）承载 diff 算法与路径生成；`JsonCompare.vue` 负责布局与状态。
- 路径格式与 `JsonParser.vue` 内 `parseNodePath`（`188:199:src/views/JsonParser.vue`）对齐，便于树联动。
- 虚拟滚动下滚动定位参考 JsonParser 搜索（`useJsonTreeSearch`）退路：定位时临时关 `virtual`。
