# JsonParser 结果树搜索与体验优化

## Goal
在 `src/views/JsonParser.vue` 的解析结果区，为「最终结果」树形预览（vue-json-pretty）增加搜索能力，并提升查看体验。让用户能在解析后的大 JSON 里快速定位字段 / 值。

## Requirements
- 在解析信息行（`JsonParser.vue:178-186`）新增搜索输入框，**仅作用于「最终结果」树**（`188-206`），不影响「解析过程」每层展示。
- 搜索形态：**高亮模式**——保留整棵树，命中的 key / value 文字高亮（`<mark>` 风格）。
- 匹配范围：**key 和 value 都搜**，默认**忽略大小写**。
- 触发与快捷键：`Enter` 跳到下一个命中、`Shift+Enter` 上一个、`Esc` 清空搜索。
- 命中导航：搜索框旁显示 `当前 / 总数`（如 `2 / 7`），跳转时命中节点若被折叠则**自动展开并滚动定位**。
- 无命中：显示「无匹配结果」提示。
- 清空搜索后恢复原始树与展开状态。

## Acceptance Criteria
- [ ] 输入关键字回车后，结果树中命中的 key/value 被清晰高亮。
- [ ] 命中计数正确，`Enter`/`Shift+Enter` 可在命中间循环跳转。
- [ ] 命中节点被折叠时能自动展开并滚动到可见位置。
- [ ] 无命中时显示明确提示。
- [ ] `Esc` 或清空输入后恢复原始树。
- [ ] 兼容现有虚拟滚动与移动端样式。

## Definition of Done
- lint / type-check 通过。
- 沿用现有 Tailwind 设计变量，深浅色一致。

## Technical Approach
- `vue-json-pretty@2.6` 无原生搜索：用 `renderNodeKey` / `renderNodeValue`（或 `#renderNodeKey` / `#renderNodeValue` 插槽）对命中文字包裹高亮。
- 命中收集：递归遍历 `result.final`，记录命中路径，用于计数、导航、自动展开。
- 虚拟滚动定位为风险点：实现阶段先验证 vue-json-pretty 是否暴露滚动/scrollTo 能力；不可靠时退路为搜索激活期间临时关闭 `virtual`。
- 搜索逻辑可抽到新 composable（如 `useJsonSearch`），保持 `JsonParser.vue` 简洁。

## Decision (ADR-lite)
- **Context**: 用户希望解析后能在大 JSON 树里快速定位字段/值；vue-json-pretty 无内置搜索。
- **Decision**: 采用高亮模式（保留上下文）+ 命中导航，而非过滤模式；用户跳过模式选择，按推荐默认拍板。
- **Consequences**: 体验贴近原树查找；虚拟滚动下的滚动定位是主要实现风险，已规划退路。

## Out of Scope
- 过滤模式切换、正则匹配、复制 JSONPath、一键展开/折叠全部、搜索历史/持久化。
- 「解析过程」每层折叠展示的改动。

## Research References
- [`research/vue-json-pretty-search.md`](research/vue-json-pretty-search.md) — vue-json-pretty 无原生搜索，需用插槽高亮或裁剪 data 实现，虚拟滚动定位是风险点。

## Technical Notes
- 改动集中在 `src/views/JsonParser.vue` + 新增 composable。
- 兼容虚拟滚动（`virtual / height=380 / item-height=22`）。
