# JSON 对比 — 技术设计

## Architecture

```
JsonCompare.vue
├── useJsonParse (×2 或封装双端 parse 状态)
├── useJsonDiff (新) — diff 算法、路径、报告文本
├── useJsonTreeSearch / 定位逻辑 (可抽 useJsonTreeLocate)
└── vue-json-pretty ×2 — A 树、B 树 + 高亮 render
```

- **不新增 npm 依赖**：自实现 deep diff walker，复用 `smartParse` 输出。
- **文件边界**：
  - `src/composables/useJsonDiff.ts` — 比较与 diff 条目类型
  - `src/views/JsonCompare.vue` — 页面
  - `src/router/index.ts`、`src/views/Home.vue` — 路由与入口

## Data Flow

1. 用户编辑 A/B textarea → 本地 state（不自动对比）。
2. 点击对比 → `smartParse(A)`、`smartParse(B)`；任一 `error` → 展示错误，停止。
3. 按当前规则（严格/宽松）`diffJson(a.final, b.final)` → `DiffEntry[]`。
4. `DiffEntry` 字段建议：
   - `path: string` — 如 `root.a["中文"][0]`（对外展示可去 `root.` 前缀或统一保留内部 path）
   - `kind: 'only_a' | 'only_b' | 'value' | 'type'`
   - `valueA?: unknown`
   - `valueB?: unknown`
5. 列表筛选 → 过滤 `DiffEntry[]`；复制报告 → 序列化为纯文本。
6. 点击条目 → `path` 映射到 vue-json-pretty 节点 → 展开祖先、滚动、添加高亮 class。

## Diff 算法要点

### 严格模式

- `null` / `undefined` / 原始类型 / 对象 / 数组分支比较。
- 对象：key 并集；仅 A → `only_a`；仅 B → `only_b`；共有 key 递归。
- 数组：按下标对齐；长度不等 → 多余下标为 only_a / only_b；元素递归。
- 叶子：`typeof` 不同 → `type`；同类型用 `Object.is` 或严格相等。

### 宽松模式

- 叶子：若双方均为 number 或「数字字符串」（`/^-?\d+(\.\d+)?$/` 且 `Number()` 有限）→ 比较数值。
- 数组：将两侧转为可排序的「签名」多重集合（如对每项递归签名后排序再比）；长度或 multiset 不同则产生差异条目（需设计可读的 path，可对「无法对应下标」的项用 `[]` 虚拟路径或按排序后索引 — 实现时优先**列表语义正确**，路径可为近似）。

> 宽松数组实现风险：无序对比难以映射稳定 path。v1 策略：宽松模式下数组差异条目 path 使用 `path[]` 表示「数组层差异」，列表展示值摘要；双树仍高亮整个数组节点。若实现过复杂，在 implement 阶段记录并收敛。

## 树高亮

- 复用 JsonParser 非 scoped 高亮思路（`.jsp-hit` / `.jsp-hit-current`），扩展：
  - `only_a` — danger 色系
  - `only_b` — primary 色系
  - `value` / `type` — warn 色系
- `renderNodeKey` / `renderNodeValue` 根据当前选中 diff path 与节点 path 前缀匹配决定是否高亮。
- 列表当前选中项 → `current` 样式（与搜索 `jsp-hit-current` 一致）。

## 滚动定位

- 与 `useJsonTreeSearch` 相同风险：`:virtual="true"` 时 DOM 节点可能不存在。
- **策略**：列表点击定位期间，对应树 `:virtual="false"` + 展开深度足够；定位后可选恢复 virtual（v1 可定位期间保持 false 简化）。

## 差异报告文本格式（复制）

```
JSON 对比报告（严格模式）
共 N 处差异

[仅 A 有] a.b.c
[仅 B 有] x.y
[值不同] foo.bar: "old" → "new"
[type] baz: number → string
```

## Compatibility

- 与 JsonParser 共用 `smartParse` / `maxDepth`，行为一致。
- 不修改 JsonParser 现有功能。

## Rollback

- 删除新路由、视图、composable、Home 卡片即可回滚，无数据迁移。
