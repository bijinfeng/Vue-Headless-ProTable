# Vue Headless ProTable PRD

## 1. 产品概述 (Product Overview)
本项目旨在开发一个面向 Vue 3 的 Headless (无头) ProTable 组件的核心逻辑（组合式函数 Composable）。该组件将提供与 Ant Design ProComponents 中 `ProTable` 完全一致的开发体验和底层逻辑，但完全剥离 UI 渲染层。

这意味着它可以与任何 Vue UI 组件库（如 Element Plus, Ant Design Vue, Naive UI, Vuetify 等）结合使用，提供极高的灵活性、可定制性和跨项目复用性。

## 2. 目标与愿景 (Goals & Vision)
- **体验对齐**：对齐 Antd ProTable 的核心心智模型，业务侧只需关注 `request` 数据获取与 `columns` 配置，无需手写繁琐的 `loading`、`pagination` 和表单查询状态代码。
- **框架无关 (Headless)**：纯逻辑抽象，只输出数据和状态方法，不依赖任何特定的 UI 框架。
- **类型安全**：使用 TypeScript 编写，提供完善的泛型推导（表单参数泛型、数据列表泛型）。
- **易于二次封装**：企业内部开发者可以基于此底层核心，结合自身的设计规范轻松封装出具备特定 UI 风格的 ProTable 组件。

## 3. 核心功能需求 (Core Features)

### 3.1 数据请求与生命周期管理 (Data Fetching & Lifecycle)
- 支持传入 `request` 异步函数，内部自动接管 `loading` 状态、错误处理。
- 支持 `params`（额外参数）响应式对象，当 `params` 发生变化时自动触发重新请求，并将分页重置为第一页。
- 支持手动刷新 (`reload`)、重置并刷新 (`reset`) 方法。
- 支持定时轮询功能 (`polling`)，并在页面隐藏时自动暂停以节省性能。

### 3.2 高级筛选与表单联动 (Search Form Integration)
- 基于 `columns` 的 `valueType` 和配置，自动提取查询表单状态 (`searchModel`)。
- 提供表单的提交 (`submit`) 和重置 (`reset`) 方法。
- 联动 `request` 函数，在提交表单时自动将表单数据与分页数据合并，作为参数发送请求。

### 3.3 分页、排序与过滤 (Pagination, Sorting & Filtering)
- 内置分页状态管理 (`current`, `pageSize`, `total`)。
- 排序状态管理 (`sorter`)：单列排序与多列排序。
- 过滤状态管理 (`filter`)：表头下拉过滤。
- 分页、排序、过滤状态变化时自动触发数据获取。

### 3.4 标题栏、工具栏与批量操作 (Toolbar & Batch Actions)
- **标题栏 (Header Title)**：支持配置表格标题 `headerTitle`，或通过插槽 `#headerTitle` 自定义。
- **操作区 (ToolBar Render)**：支持通过 `toolBarRender` 或 `#toolBarRender` 插槽在右上角渲染新增、导出等核心操作按钮。
- **内置配置项 (Options)**：
  - **刷新 (Reload)**：一键重新获取数据。
  - **密度 (Density)**：管理表格的显示密度状态（紧凑、中等、宽松）。
  - **全屏 (Fullscreen)**：提供表格区域全屏状态及切换方法。
  - **列设置 (Column Settings)**：管理列的显隐状态、固定位置（左/右）、自定义排序（拖拽调整列顺序）。
- **批量操作警告栏 (Table Alert)**：当选中行时，表格顶部自动出现提示条（如“已选择 3 项”），并支持 `tableAlertRender` 和 `tableAlertOptionRender` 来展示批量删除、导出等操作。

### 3.5 行选择与展开 (Row Selection & Expandable)
- **行选择 (Row Selection)**：管理选中的行数据 (`selectedRowKeys`, `selectedRows`)。支持全选、单选、禁用特定行选择。
- **展开行 (Expandable)**：支持嵌套表格或展开显示详情，提供展开状态的管理机制。

### 3.6 高级表格扩展 (Advanced Table Extensions)
- **可编辑表格 (Editable Table)**：提供行级别或单元格级别的编辑能力。包含编辑态的管理 (`editableKeys`)，以及保存、取消等操作的封装。
- **数据转换 (Date Formatter)**：内置 `dateFormatter` 配置，在表单提交触发 `request` 前，自动将日期类型的值转换为指定的格式（如 `'YYYY-MM-DD'` 或时间戳），减轻业务手动格式化的心智负担。
- **表单布局与折叠 (Form Layout & Collapsed)**：支持通过 `search` 属性配置表单的栅格布局 (`span`)、默认是否折叠 (`defaultCollapsed`)，并在表单项过多时自动展示“展开/收起”按钮。

## 4. 架构与设计方案 (Architecture & Design)

采用 Vue 3 的 **Composition API** 范式，核心输出为一个 `useProTable` Hook。

### 4.1 核心数据流转
用户操作 (UI 操作，如点击下一页、输入搜索条件) -> 触发 `useProTable` 暴露的方法 -> 更新内部状态 (分页、筛选器等) -> 自动触发内部 `fetchData` 方法 -> 调用外部传入的 `request` -> 更新 `dataSource` 响应式对象 -> 驱动业务层 UI 渲染。

### 4.2 API 设计草案 (Draft API)

#### 入参 (Options)
```typescript
interface UseProTableOptions<T, U> {
  // 核心数据获取方法
  request?: (
    params: U & { pageSize?: number; current?: number }, 
    sorter: Record<string, 'ascend' | 'descend'>, 
    filter: Record<string, (string | number)[]>
  ) => Promise<{ data: T[]; success: boolean; total?: number }>;
  
  // 额外请求参数
  params?: Ref<U> | (() => U) | U;
  
  // 列配置（用于提取表单字段、管理列显隐）
  columns?: Ref<ProColumnType<T>[]> | ProColumnType<T>[];
  
  // 分页初始配置
  pagination?: boolean | { defaultCurrent?: number; defaultPageSize?: number };
  
  // 轮询间隔 (ms)
  polling?: number;
  
  // 是否手动触发首次请求（默认为 false，即挂载时自动请求）
  manual?: boolean;
}
```

#### 返回值 (Returns)
```typescript
interface UseProTableReturns<T, U> {
  // === 数据与加载状态 ===
  dataSource: Ref<T[]>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  
  // === 分页状态与方法 ===
  pagination: {
    current: Ref<number>;
    pageSize: Ref<number>;
    total: Ref<number>;
    onChange: (page: number, pageSize: number) => void;
  };
  
  // === 查询表单状态与方法 ===
  search: {
    model: Reactive<U>;
    submit: () => void;
    reset: () => void;
  };
  
  // === 全局操作方法 (ActionRef) ===
  action: {
    reload: () => void;
    reloadAndRest: () => void;
    clearSelected: () => void;
  };

  // === 列控制状态 (ColumnManager) ===
  columnManager: {
    // 处理过显隐和顺序的最终列配置
    displayColumns: ComputedRef<ProColumnType<T>[]>; 
    // 修改列显隐状态
    setColumnVisibility: (dataIndex: string, visible: boolean) => void;
    // 重置列配置
    resetColumns: () => void;
  };
  
  // === 行选择状态 ===
  rowSelection: {
    selectedRowKeys: Ref<Array<string | number>>;
    selectedRows: Ref<T[]>;
    setSelectedKeys: (keys: Array<string | number>) => void;
  };
  
  // === 工具栏状态 ===
  toolbar: {
    density: Ref<'large' | 'middle' | 'small'>;
    setDensity: (size: 'large' | 'middle' | 'small') => void;
    isFullscreen: Ref<boolean>;
    toggleFullscreen: () => void;
  };
}
```

## 5. 极简的 UI 框架集成方案 (Ultra-Simple UI Integration)

为了将“结构化数据描述”和“底层逻辑”极致封装，同时保持与 UI 框架结合时的极简性，本 Headless 方案不仅提供底层的 `useProTable` Hook，还将提供一个**框架无关的 `<ProTable>` 容器组件** 和 **UI 适配器 (UI Adapter)** 机制。

业务层只需要进行一次全局或局部的**组件注册映射**，即可获得开箱即用的 ProTable 组件，无需每次都手写繁琐的 `<template>` 模板。

### 5.1 极具灵活性的 UI 适配器注册机制 (Flexible UI Adapter Registry)

由于不同 UI 框架的组件 API 存在巨大差异（如 Element 的 `el-table-column` 插槽机制与 Antd 的 `columns` 属性机制不同，双向绑定的字段名也可能不同），我们的注册机制不仅支持直接注册组件，还支持**属性映射 (Props Mapping)**、**事件映射**，甚至允许直接注册**自定义适配层组件 (Adapter Component)**。

Headless 库暴露出 `createProTable` 工厂函数。开发者可以通过它将目标 UI 框架桥接为标准化的 ProTable。

```typescript
// element-plus-adapter.ts
import { createProTable } from 'headless-pro-table';
import { ElTable, ElTableColumn, ElPagination, ElForm, ElInput } from 'element-plus';
import ElementTableWrapper from './adapters/ElementTableWrapper.vue'; // 针对复杂差异自定义的适配组件

export const ElementProTable = createProTable({
  components: {
    // 1. 对于简单的组件，直接注册
    Button: ElButton,
    
    // 2. 对于存在属性/事件差异的组件，提供 mapProps/mapEvents 进行灵活转换
    Input: {
      component: ElInput,
      mapProps: (props) => ({
        ...props,
        clearable: props.clearable ?? true, // 统一默认开启清除
      }),
    },

    // 3. 对于差异极大的复杂组件（如 Table），允许开发者传入自定义的适配组件
    // Headless 层只负责把标准化的 dataSource, columns, loading 等传给该适配组件，由适配组件内部处理具体 UI 库的渲染逻辑
    Table: ElementTableWrapper, 
    
    Pagination: {
      component: ElPagination,
      // 处理属性命名映射，例如 headless 内部叫 current，Element 叫 current-page
      mapProps: (props) => ({
        'current-page': props.current,
        'page-size': props.pageSize,
        'total': props.total,
      }),
      // 处理事件映射
      mapEvents: (emit) => ({
        'update:current-page': (page) => emit('update:current', page),
        'update:page-size': (size) => emit('update:pageSize', size),
      })
    },
    Form: ElForm,
  }
});
```

### 5.2 业务开发者的极简使用 (Usage in Business Code)

完成适配器注册后，业务开发者在使用时，**完全不需要写 UI 库的具体标签**，只需要传入 `request` 和 Schema `columns`。所有的表单渲染、表格渲染、分页联动都在 Headless `<ProTable>` 内部自动完成。

```vue
<template>
  <!-- 直接使用注册好的 ElementProTable，体验与 Antd ProTable 完全一致 -->
  <ElementProTable
    :request="fetchData"
    :columns="columns"
    :pagination="{ defaultPageSize: 10 }"
  />
</template>

<script setup lang="ts">
import { ElementProTable } from './element-plus-adapter';

const columns = [
  {
    title: '用户名',
    dataIndex: 'username',
    valueType: 'text', // 自动映射到 ElInput
  },
  {
    title: '状态',
    dataIndex: 'status',
    valueType: 'select', // 自动映射到 ElSelect
    valueEnum: [
      { label: '活跃', value: 'active' },
      { label: '禁用', value: 'disabled' },
    ]
  }
];

const fetchData = async (params) => {
  // 请求接口...
  return { data: [], success: true, total: 100 };
};
</script>
```

### 5.3 自定义组件支持 (Custom Component Support in Form & Table)

除了内置的通用 `valueType` 渲染外，业务开发中常会遇到极其定制化的业务组件（如人员选择器、复杂的图表列）。Headless ProTable 提供三种维度的自定义支持，确保在表单和表格中灵活渲染：

**1. 插槽覆盖 (Scoped Slots)**
最符合 Vue 直觉的方式。在外部 `<ElementProTable>` 上传入特定名称的插槽，组件内部的适配器会自动将数据透传出来。
- 表单项插槽约定：`#form-[dataIndex]="{ model, field }"`
- 表格单元格插槽约定：`#cell-[dataIndex]="{ record, column }"`

**2. 渲染函数 (Render Function)**
通过在 `columns` 配置中直接传入 Vue 的 `render` 函数，适用于需要高度动态化、配置化的场景。
- `renderFormItem?: (model, field) => VNode`
- `render?: (text, record, index) => VNode`

**3. 自定义 `valueType` 注册**
如果某个自定义组件（如 `UserPicker`）在全公司多个表格中复用，可以直接将其注册到 Adapter 的全局组件字典中，然后通过 `valueType: 'userPicker'` 即可直接驱动。

### 5.4 核心设计思想总结
- **Schema 驱动内聚**：Headless 库内部封装了 `<SchemaForm>` 和 `<SchemaTable>`，它们通过读取 `UI Adapter` 中的映射，动态渲染 `<component :is="...">`。
- **配置即组件**：业务层代码极简，彻底告别复制粘贴模板代码。
- **高可替换性**：如果未来项目从 Element Plus 迁移到 Ant Design Vue，业务代码 `<ElementProTable :columns="...">` 层的配置完全不用改，只需要替换全局的 UI Adapter 映射即可。

## 6. 里程碑与开发计划 (Milestones)

- **Phase 1: 核心 Hook 架构设计与基础列表能力**
  - 定义 Types (Column, Request, Pagination)。
  - 实现 `useProTable` 基础骨架。
  - 完成 `request` 数据获取逻辑（防抖、并发竞态处理）、`loading` 状态、`pagination` 分页管理。
- **Phase 2: 搜索与表单联动能力**
  - 实现基于 `columns` 自动生成搜索表单初始值。
  - 实现查询表单状态管理，以及与分页状态、`request` 函数的深度联动（搜索后回第一页等细节）。
- **Phase 3: 高级特性与工具栏管理**
  - 实现列控制（显隐控制、列顺序调整）。
  - 实现密度控制、全屏控制状态管理。
  - 实现 `params` 参数监听和定时 `polling` 功能。
- **Phase 4: 文档与多 UI 库示例**
  - 编写基于此核心逻辑封装 Element Plus 的 `ProTable.vue` 示例。
  - 编写基于 Ant Design Vue 的 `ProTable.vue` 示例，验证其灵活性。
