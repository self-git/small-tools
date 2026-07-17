# JSON 对比 — 实现清单

## Ordered Checklist

1. [ ] `src/composables/useJsonDiff.ts` — `DiffEntry` 类型、`diffJson(a, b, mode)`、路径格式化、`formatDiffReport(entries, mode)`
2. [ ] 单元逻辑自测：严格/宽松样例（手动在 dev 或临时 script，无强制测试文件除非用户要求）
3. [ ] `src/views/JsonCompare.vue` — 布局、双 parse 状态、对比按钮、规则切换、结果区状态机
4. [ ] 差异列表：筛选 chips、复制路径、复制报告
5. [ ] 双 vue-json-pretty + 高亮 render + 列表点击定位（先 A 树验证，再 B 树）
6. [ ] 响应式：`lg` 并排 / 小屏堆叠
7. [ ] `src/router/index.ts` 注册 `/json-compare`
8. [ ] `src/views/Home.vue` 卡片
9. [ ] `npm run build` 通过

## Validation

```bash
cd /Users/wwdd/Documents/code/小工具
npm run build
```

手动：

- 严格：相同 JSON → 仅提示；`{"a":1}` vs `{"a":2}` → 列表 + 双树
- 宽松：`[1,2]` vs `[2,1]` → 无差异；`1` vs `"1"` → 无差异
- 单侧非法 JSON → 错误提示、无 diff
- 点击列表项 → 双树滚动高亮
- 移动端宽度 → 树堆叠

## Risky Files

- `useJsonDiff.ts` — 宽松数组 path 语义
- `JsonCompare.vue` — 双树 + 虚拟滚动定位
- 高亮样式与 JsonParser 全局 class 命名冲突 → 使用独立 prefix 如 `.jcmp-`

## Pre-start Gate

- [x] `prd.md` 收敛完成
- [x] `design.md` / `implement.md` 已写
- [x] 用户批准进入实现
- [x] `npm run build` 通过
