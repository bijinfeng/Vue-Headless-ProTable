# Vue Headless ProTable（Monorepo）

一个面向 **Vue 3** 的 “Headless（无头）ProTable” 实现：核心层只负责 **数据请求/状态管理/列能力**，再通过 **UI Adapter（适配层）** 接入不同的组件库（当前内置 Element Plus 与 Ant Design Vue）。

- PRD：见 [PRD.md](file:///workspace/PRD.md)
- 技术方案：见 [TECH_SPEC.md](file:///workspace/TECH_SPEC.md)

## 包结构

- [@headless-pro-table/core](file:///workspace/packages/core)：核心逻辑与类型
  - `useProTable`：请求编排、分页/排序/筛选、搜索表单状态、跨页选中、可编辑、valueEnum 等
  - `createProTable`：基于 UI Adapter registry 组装出可用的 `ProTable` 组件
- [@headless-pro-table/element-plus](file:///workspace/packages/element-plus)：Element Plus 适配器（导出 `ElementProTable`）
- [@headless-pro-table/antdv](file:///workspace/packages/antdv)：Ant Design Vue 适配器（导出 `AntdvProTable`）
- [playground](file:///workspace/playground)：本地演示与手动验证

## 本地开发

### 安装

```bash
pnpm install
```

### 运行 Playground

```bash
pnpm --filter playground dev
```

## 构建与测试

### 构建

```bash
pnpm --filter @headless-pro-table/core build
pnpm --filter @headless-pro-table/element-plus build
pnpm --filter @headless-pro-table/antdv build
```

### 测试（core）

```bash
pnpm --filter @headless-pro-table/core test
```

## 使用方式

### 直接使用内置适配器

在你的项目中安装对应组件库后，直接使用已组装好的 ProTable：

```ts
import { ElementProTable } from '@headless-pro-table/element-plus'
// import { AntdvProTable } from '@headless-pro-table/antdv'
```

Playground 中有完整示例可参考：[App.vue](file:///workspace/playground/src/App.vue) 与 [mock.ts](file:///workspace/playground/src/mock.ts)。

### 自定义 UI 适配器

如果你希望适配其它 UI 框架/自研组件库，可以基于 `createProTable` 注册 registry：

```ts
import { createProTable } from '@headless-pro-table/core'

export const MyProTable = createProTable({
  Table: MyTable,
  Form: MyForm,
  FormItem: MyFormItem,
  Pagination: MyPagination,
  Button: MyButton,

  text: MyInput,
  select: MySelect,
  date: MyDatePicker,
})
```

## Columns 约定（摘要）

核心列类型为 `ProColumnType`（见 [types.ts](file:///workspace/packages/core/src/types.ts)），常用字段：

- `title` / `dataIndex`
- `valueType`：决定搜索表单控件类型（例如 `text | select | date`，具体取决于你在 adapter 中注册的 key）
- `hideInSearch` / `hideInTable`
- `valueEnum`：支持对象/数组/异步函数（适用于 `select` 的筛选与回显）
- `render`：自定义表格单元格渲染
- `renderFormItem`：自定义搜索表单项渲染

## License

ISC

