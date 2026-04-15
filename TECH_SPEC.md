# Vue Headless ProTable 技术方案设计 (Technical Specification)

## 1. 架构总览 (Architecture Overview)

本项目采用 **分层架构**，分为 **核心逻辑层 (Core)** 和 **UI 适配层 (Adapter)**。

### 1.1 核心逻辑层 (`useProTable` & `createProTable`)
- **`useProTable` (Composable)**：纯数据模型层。负责管理 `dataSource`、`loading`、`pagination`、`searchModel`、`columns` 状态，并处理 `request` 的防抖、竞态和数据流转。
- **`createProTable` (Component Factory)**：视图组装层。接收一个 UI 适配器配置 (Adapter Registry)，返回一个标准的 Vue 组件 (`<ProTable>`)。该组件内部使用渲染函数 (`h` 或 JSX) 将核心状态绑定到适配器组件上。

### 1.2 UI 适配层 (Adapter Packages)
- **`@headless-pro-table/element-plus`**：预置的 Element Plus 适配器。
- **`@headless-pro-table/antdv`**：预置的 Ant Design Vue 适配器。
开发者也可以通过传入自定义配置，轻松接入 Naive UI、Vuetify 等任何组件库。

---

## 2. 核心数据流转设计

```text
User Input (Input/Select/Pagination) 
       ↓ 触发 update:modelValue / change
Adapter Component (将 UI 事件转换为 Headless 标准 onChange 事件)
       ↓ 
useProTable 内部状态更新 (searchModel.xxx = val, pagination.current = val)
       ↓ (watch / 手动触发)
执行传入的 request(params, sorter, filter)
       ↓ 
更新 dataSource 和 pagination.total
       ↓ 
Adapter Component (将 Headless 数据映射给 UI 组件的 dataSource/data 属性)
       ↓ 
UI 视图更新
```

---

## 3. UI 适配器设计与双框架验证 (Adapter Verification)

为了验证 PRD 中“极具灵活性的注册机制”的可行性，我们对 Element Plus 和 Ant Design Vue 进行模拟适配设计。

### 3.1 适配器标准化接口 (Adapter Standard Interface)
`createProTable` 要求注册的组件必须能接收特定的**标准化 Props**。通过 `mapProps` 函数，我们将标准化 Props 映射为特定 UI 库的 Props。

```typescript
// 标准化的 Headless Props 接口定义
interface StandardInputProps {
  value: any;
  onChange: (val: any) => void;
}

interface StandardPaginationProps {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
}

interface StandardTableProps {
  dataSource: any[];
  columns: ProColumnType[];
  loading: boolean;
}
```

### 3.2 表单输入组件验证 (Input / Select)

**Element Plus (el-input) 验证：**
- **特点**：接收 `modelValue`，抛出 `update:modelValue` 事件。
```typescript
Input: {
  component: ElInput,
  mapProps: (props: StandardInputProps) => ({
    modelValue: props.value,
    'onUpdate:modelValue': props.onChange, // Vue 3 中事件可通过 onXxx 传入
    clearable: true,
  })
}
```

**Ant Design Vue (a-input) 验证：**
- **特点**：接收 `value`，抛出 `update:value` 事件。
```typescript
Input: {
  component: AInput,
  mapProps: (props: StandardInputProps) => ({
    value: props.value,
    'onUpdate:value': props.onChange,
    allowClear: true,
  })
}
```
**结论**：`mapProps` 完美解决了 v-model 字段和清除属性命名不同的问题。

### 3.3 分页组件验证 (Pagination)

**Element Plus (el-pagination) 验证：**
```typescript
Pagination: {
  component: ElPagination,
  mapProps: (props: StandardPaginationProps) => ({
    'current-page': props.current,
    'page-size': props.pageSize,
    total: props.total,
    'onUpdate:current-page': (val) => props.onChange(val, props.pageSize),
    'onUpdate:page-size': (val) => props.onChange(props.current, val),
  })
}
```

**Ant Design Vue (a-pagination) 验证：**
```typescript
Pagination: {
  component: APagination,
  mapProps: (props: StandardPaginationProps) => ({
    current: props.current,
    pageSize: props.pageSize,
    total: props.total,
    'onChange': (page, size) => props.onChange(page, size),
  })
}
```
**结论**：分页组件的参数与事件差异完全可通过 `mapProps` 抹平。

### 3.4 复杂表格组件验证 (Table & Columns)

这是差异最大的部分：
- Element Plus 采用 `<el-table>` 嵌套 `<el-table-column>` 的插槽模式。
- Ant Design Vue 采用 `<a-table :columns="columns">` 的属性模式。

由于差异过大，我们采用 PRD 中提到的 **“自定义适配层组件 (Adapter Component)”** 方案。

**Element Plus 适配器组件 (`ElementTableWrapper.vue`) 设计：**
```vue
<template>
  <el-table :data="dataSource" v-loading="loading" border>
    <el-table-column 
      v-for="col in columns" 
      :key="col.dataIndex" 
      :prop="col.dataIndex" 
      :label="col.title"
    >
      <template #default="{ row, column, $index }">
        <!-- 优先渲染外部传入的自定义插槽（名称为 bodyCell-xxx） -->
        <slot :name="`bodyCell-${col.dataIndex}`" :record="row" :index="$index">
          <!-- 回退渲染默认文本或 Schema 组件 -->
          <span>{{ row[col.dataIndex] }}</span>
        </slot>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
// 接收标准化 Props
defineProps<{
  dataSource: any[];
  columns: any[];
  loading: boolean;
}>();
</script>
```

**Ant Design Vue 适配器设计：**
由于 Antd 本身就接收 `columns` 属性，且通过 `#bodyCell` 插槽提供自定义渲染，因此它的适配层极其简单，甚至可以直接映射：
```typescript
Table: {
  component: ATable,
  mapProps: (props: StandardTableProps) => ({
    dataSource: props.dataSource,
    columns: props.columns,
    loading: props.loading,
  })
}
```
**结论**：对于差异极大的复杂组件，允许传入一个轻量的 Vue 包装组件，内部抹平渲染差异，同时保留了插槽的透传能力。PRD 的设计是**完全可行且优雅的**。

## 3.5 自定义组件在表单与表格中的渲染方案 (Custom Component Rendering)

根据 PRD，业务层面需要在搜索表单与表格列中渲染自定义组件。技术实现上将按以下优先级处理渲染：

### 1. 表格单元格渲染 (Table Cell Rendering)
对于 `ElementTableWrapper.vue` 或 `AntdTableWrapper.vue`，我们在循环 `columns` 渲染时，采用如下策略判断如何渲染该列的内容：

1. **是否有外部具名插槽传入**：检查是否有 `#cell-${col.dataIndex}` 插槽。如果有，将 `row`、`column` 和 `index` 暴露出去。
2. **是否配置了 `render` 属性**：如果 `col.render` 存在，调用该函数并渲染其返回的 VNode。
3. **基于 `valueType` 匹配全局注册组件**：从 `registry` 中查找该类型对应的显示组件（如 `'date'` 可能渲染 `ElDatePicker` 或格式化后的文本）。
4. **默认渲染**：直接渲染原始值 `row[col.dataIndex]`。

```vue
<!-- ElementTableWrapper 渲染单元格的核心逻辑 -->
<template #default="{ row, column: elCol, $index }">
  <!-- 1. 插槽优先级最高 -->
  <slot v-if="$slots[`cell-${col.dataIndex}`]" :name="`cell-${col.dataIndex}`" :record="row" :column="col" :index="$index" />
  
  <!-- 2. render 函数次之 -->
  <component v-else-if="col.render" :is="col.render(row[col.dataIndex], row, $index)" />
  
  <!-- 3. valueType 或 默认文本 -->
  <span v-else>{{ formatValue(row[col.dataIndex], col.valueType) }}</span>
</template>
```

### 2. 搜索表单项渲染 (Search Form Item Rendering)
在 `SchemaForm` 组件内部（Headless 提供的渲染函数中），针对每个搜索项，采用类似的策略：

1. **是否有外部具名插槽传入**：检查 `#form-${col.dataIndex}` 插槽。如果有，将 `model` 和 `field` 透传。
2. **是否配置了 `renderFormItem`**：如果 `col.renderFormItem` 存在，调用其返回 VNode。
3. **基于 `valueType` 匹配全局注册表单组件**：从 `registry` 中找到如 `'select'` 对应的 `ElSelect`，并将标准化的 `{ value, onChange }` Props 转换后绑定。
4. **默认降级**：默认使用 `'text'` 对应的输入框。

```vue
<!-- SchemaForm.vue 中的核心逻辑示意 -->
<template v-for="col in searchableColumns" :key="col.dataIndex">
  <component :is="registry.FormItem.component" v-bind="registry.FormItem.mapProps({ label: col.title, prop: col.dataIndex })">
    
    <!-- 1. 插槽优先级最高 -->
    <slot v-if="$slots[`form-${col.dataIndex}`]" :name="`form-${col.dataIndex}`" :model="searchModel" :field="col.dataIndex" />
    
    <!-- 2. renderFormItem 次之 -->
    <component v-else-if="col.renderFormItem" :is="col.renderFormItem(searchModel, col.dataIndex)" />
    
    <!-- 3. valueType 对应的注册组件 -->
    <component v-else :is="getRegisteredComponent(col.valueType || 'text')" 
      v-bind="getRegisteredProps(col.valueType || 'text', { 
        value: searchModel[col.dataIndex], 
        onChange: (v) => updateSearchModel(col.dataIndex, v) 
      })" 
    />
  </component>
</template>
```

这种三级降级的渲染机制，既保证了绝大多数场景的**配置即用 (极简)**，又提供了**兜底的极限灵活性 (插槽与 Render)**，完美符合“高内聚低耦合”的设计哲学。

## 4. 高级特性的技术实现思路 (Advanced Features Implementation)

针对 PRD 中的高级特性，我们在 Headless 层和 Adapter 层做如下实现规划：

### 4.1 批量操作警告栏与工具栏 (Table Alert & ToolBar)
在 `<ProTable>` 组件的整体布局渲染函数中，我们引入对应的插槽机制和默认组件：
```vue
<template>
  <div class="headless-pro-table">
    <SchemaForm ... />
    
    <!-- 工具栏 -->
    <div class="pro-table-toolbar">
      <div class="pro-table-toolbar-left">
        <slot name="headerTitle">{{ headerTitle }}</slot>
      </div>
      <div class="pro-table-toolbar-right">
        <slot name="toolBarRender" />
        <ToolbarOptions :options="options" /> <!-- 内置刷新、密度、列设置 -->
      </div>
    </div>

    <!-- 批量警告栏 -->
    <div v-if="rowSelection && selectedRowKeys.length > 0" class="pro-table-alert">
      <slot name="tableAlertRender" :selectedRowKeys="selectedRowKeys">
        已选择 <a>{{ selectedRowKeys.length }}</a> 项
      </slot>
      <div class="pro-table-alert-option">
        <slot name="tableAlertOptionRender" :onCleanSelected="clearSelected" />
      </div>
    </div>

    <SchemaTable ... />
  </div>
</template>
```

### 4.2 数据自动转换 (Date Formatter)
在 `useProTable` 触发 `fetchData` 前，遍历 `columns` 配置，若遇到 `valueType === 'date' | 'dateTime'`，且存在 `dateFormatter` 配置（默认 `'YYYY-MM-DD'` 或 `'string'` 等），则拦截并克隆 `searchModel`，调用如 `dayjs` 将响应式对象中的原生 Date 对象转换为接口需要的字符串或时间戳，再传入 `request`。

### 4.3 可编辑表格状态管理 (Editable)
在 `useProTable` 返回的 `action` 对象中暴露针对行的操作：
```typescript
const editableState = reactive({
  editableKeys: [],
  actionRender: (row, config) => { /* 渲染保存/取消按钮 */ },
});
```
针对 `columns` 中的可编辑列，当该行的 `id` 存在于 `editableKeys` 中时，Adapter 渲染对应的 Input 组件而非默认文本，并在保存时自动触发 `onSave` Hook 并在成功后局部更新 `dataSource` 或触发 `reload`。

### 4.4 搜索表单的栅格与折叠 (Form Layout & Collapsed)
`SchemaForm` 根据配置的 `search.span` (例如默认 8 占 1/3) 动态设置每个 `FormItem` 的宽度，同时内部维护一个 `collapsed` 状态。
若 `columns` 数量计算出的占位总数超过一行，则截断显示，并在最后一个 Item 后强制渲染 **“展开/收起”** 的触发按钮。

---

## 5. `useProTable` Hook 核心实现思路

```typescript
export function useProTable<T, U>(options: UseProTableOptions<T, U>) {
  const { request, pagination: initPagination, manual = false } = options;

  // 1. 状态初始化
  const dataSource = ref<T[]>([]) as Ref<T[]>;
  const loading = ref(false);
  const searchModel = reactive<any>({});
  
  const pagination = reactive({
    current: initPagination?.defaultCurrent || 1,
    pageSize: initPagination?.defaultPageSize || 10,
    total: 0,
  });

  // 2. 核心请求方法
  const fetchData = async () => {
    if (!request) return;
    loading.value = true;
    try {
      const res = await request({
        ...searchModel,
        current: pagination.current,
        pageSize: pagination.pageSize,
      }, {}, {});
      
      dataSource.value = res.data;
      pagination.total = res.total || 0;
    } finally {
      loading.value = false;
    }
  };

  // 3. 事件与副作用
  const reload = () => fetchData();
  const reset = () => {
    Object.keys(searchModel).forEach(key => delete searchModel[key]);
    pagination.current = 1;
    fetchData();
  };

  watch(() => [pagination.current, pagination.pageSize], () => {
    fetchData();
  });

  if (!manual) {
    onMounted(fetchData);
  }

  return {
    dataSource,
    loading,
    pagination,
    searchModel,
    action: { reload, reset }
  };
}
```

## 6. 项目工程化与打包方案
- **Monorepo 管理**：采用 `pnpm` workspace 结构。
  - `packages/core`: Headless 核心代码。
  - `packages/element-plus`: Element Plus 适配层。
  - `packages/antdv`: Ant Design Vue 适配层。
- **构建工具**：使用 `Vite` 或 `tsup` 打包，输出 ESM 和 CJS 格式。
- **类型声明**：输出 `.d.ts` 以提供完整的 TS 泛型支持。