# vue-json-pretty 搜索能力调研

## 版本
项目使用 `vue-json-pretty@^2.6.0`。

## 核心结论
`vue-json-pretty` **不提供原生的搜索 / 高亮 prop**。官方 props 列表里没有 `searchText`、`filter`、`highlight` 之类的能力。
（来源：GitHub README dev 分支、Context7 文档）

## 可用的扩展点（用于自行实现搜索）
| 扩展点 | 说明 | 适合做什么 |
|---|---|---|
| `renderNodeKey` / slot `#renderNodeKey` | 自定义渲染 key，入参 `{ node, defaultKey }` | 命中关键字时给 key 包一层高亮 `<mark>` |
| `renderNodeValue` / slot `#renderNodeValue` | 自定义渲染 value，入参 `{ node, defaultValue }` | 命中关键字时给 value 包一层高亮 |
| `data` prop | 直接传入数据 | "过滤模式"：预先裁剪只保留命中路径的子树 |
| `deep` prop | 大于该深度的路径折叠 | 命中后可调小 deep 强制展开到命中层 |
| `selectableType` + `selectedValue`(v-model) | 路径选择 | 可配合做"跳到命中节点"的高亮选中 |
| `virtual` + `height` + `itemHeight` | 虚拟滚动 | 已启用，搜索方案需兼容虚拟滚动 |

## 两条实现路径对比

### 路径 A：高亮模式（renderNodeValue/renderNodeKey 插槽）
- 保留完整树结构，命中的 key/value 文本包 `<mark>` 高亮。
- 配合"上一个/下一个 + N/M 计数"做跳转。
- 难点：虚拟滚动下，命中节点可能被折叠或不在可视区，需要 ① 展开命中路径 ② 滚动定位。
- 优点：保留上下文，符合"在原树里查找"的直觉。

### 路径 B：过滤模式（裁剪 data）
- 自己写递归，保留命中节点及其祖先路径，其余剪掉，把裁剪后的对象传给 `data`。
- 优点：实现相对直接，命中结果一目了然。
- 缺点：丢失上下文（看不到未命中的兄弟节点）；需要额外维护"原始 / 过滤"两份数据切换。

## 虚拟滚动定位的注意点
- `virtual=true` 时 DOM 只渲染可视区，"滚动到第 N 个命中"需要借助组件暴露的滚动能力或按 item-height 估算 offset；这是高亮模式跳转的主要技术风险点，需在实现阶段验证组件是否暴露 `scrollTo`。
