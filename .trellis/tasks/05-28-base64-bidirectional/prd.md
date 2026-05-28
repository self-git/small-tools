# Base64双向转换功能

## Goal

扩展现有的Base64工具，支持Base64字符串转换为文件并下载。目前只有"文件→Base64"功能，需要添加"Base64→文件"的反向转换能力。

## What I already know

* 当前Base64工具位于 `src/views/Base64Tool.vue`
* 使用 `src/composables/useBase64.ts` 处理转换逻辑
* 支持文件上传转Base64、SVG代码转Base64
* 支持图片预览、复制Base64/img标签/CSS背景
* 支持下载为文本文件（base64.txt）
* 项目使用 Vue 3 + TypeScript + Tailwind CSS

## Assumptions (temporary)

* 用户粘贴Base64字符串后，工具应自动识别并提供下载功能
* 需要支持常见文件类型的下载（图片、文本、音频等）
* 文件名可能需要用户手动指定或自动推断

## Open Questions

* 如何处理Base64字符串中的文件类型信息？（部分Base64包含MIME类型前缀，部分不包含）
* 是否需要支持批量Base64转换？
* 文件名如何处理？（自动推断 vs 用户输入）

## Decision (ADR-lite)

**Context**: 需要决定Base64转文件功能的UI布局方式
**Decision**: 采用选项A - 添加模式切换，在现有"文件上传"和"SVG代码"旁边添加第三个选项卡"Base64解码"
**Consequences**: 保持界面一致性，用户可以清晰切换功能，无需创建新页面

**Context**: 需要决定文件名处理方式
**Decision**: 采用选项A - 自动推断 + 手动输入，如果Base64包含MIME类型则自动推断扩展名，提供输入框让用户修改文件名
**Consequences**: 平衡自动化和灵活性，用户可以快速下载或自定义文件名

**Context**: 需要决定Base64字符串格式处理方式
**Decision**: 采用选项A - 智能解析，自动识别并处理各种格式（完整格式、纯Base64、有空格、换行符等）
**Consequences**: 用户体验最佳，无需预处理Base64字符串，工具自动处理常见格式问题

## Requirements (evolving)

* [ ] 添加"Base64解码"选项卡，与现有"文件上传"和"SVG代码"并列
* [ ] 用户可以粘贴各种格式的Base64字符串（完整格式、纯Base64、有空格/换行符）
* [ ] 工具智能解析Base64字符串，自动去除干扰字符
* [ ] 自动识别MIME类型（如有）并推断文件扩展名
* [ ] 提供文件名输入框，默认填充推断的文件名（可修改）
* [ ] 提供下载按钮，将Base64转换为文件并触发浏览器下载
* [ ] 支持常见文件类型（图片、文本、PDF、音频、视频等）
* [ ] 如果是图片类型，显示预览
* [ ] 如果无法识别类型，使用默认文件名和二进制类型

## Acceptance Criteria (evolving)

* [ ] UI显示三个选项卡：文件上传、SVG代码、Base64解码
* [ ] 点击"Base64解码"选项卡，显示Base64输入区域
* [ ] 粘贴完整格式Base64（如 `data:image/png;base64,iVBORw0KGgo...`），自动解析并显示预览
* [ ] 粘贴纯Base64字符串（如 `iVBORw0KGgo...`），提示用户选择文件类型或使用默认类型
* [ ] 粘贴包含空格/换行符的Base64，自动清理并正常解析
* [ ] 文件名输入框默认填充推断的文件名（如 `image.png`）
* [ ] 用户可以修改文件名
* [ ] 点击下载按钮，浏览器触发文件下载，文件名正确
* [ ] 下载的图片文件可以正常打开和预览
* [ ] 下载的文本文件可以正常打开和编辑
* [ ] 无效Base64格式显示明确的错误提示
* [ ] 解析失败时显示具体的错误信息

## Definition of Done (team quality bar)

* 代码通过TypeScript类型检查
* 组件符合项目现有的代码风格
* 用户界面与现有工具保持一致
* 功能测试通过（手动验证）

## Out of Scope (explicit)

* 批量Base64转换（MVP不包含）
* Base64编码/解码（仅关注文件转换）
* 高级文件处理（如压缩、加密）

## Technical Notes

* 现有代码位于 `src/views/Base64Tool.vue` 和 `src/composables/useBase64.ts`
* 使用 `FileReader` 和 `Blob` API 处理文件转换
* 需要扩展 `useBase64` composable 或创建新的 composable
* 可能需要使用 `atob()` 函数解码Base64字符串
* 需要处理MIME类型解析和文件扩展名映射
* 参考现有代码中的 `convertAnyFile` 和 `convertSvgCode` 函数实现模式
