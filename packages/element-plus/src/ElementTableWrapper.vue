<template>
  <el-table
    :data="dataSource"
    v-loading="loading"
    border
    @selection-change="handleSelectionChange"
    @sort-change="handleSortChange"
    @filter-change="handleFilterChange"
    v-bind="$attrs"
  >
    <!-- 行选择列 -->
    <el-table-column
      v-if="rowSelection"
      type="selection"
      width="55"
      align="center"
    />

    <!-- 数据列循环 -->
    <el-table-column
      v-for="col in columns"
      :key="col.dataIndex"
      :prop="col.dataIndex"
      :label="col.title"
      :fixed="col.fixed"
      :sortable="col.sorter ? 'custom' : false"
    >
      <!-- 嵌套处理 Element 的具名作用域插槽 #default="{ row, column, $index }" -->
      <template #default="scope">
        <!-- 1. 外部透传进来的具名插槽优先 (如 #cell-username) -->
        <slot
          v-if="$slots[`cell-${col.dataIndex}`]"
          :name="`cell-${col.dataIndex}`"
          v-bind="scope"
          :record="scope.row"
          :column="col"
          :index="scope.$index"
        />

        <!-- 2. render 函数次优先 -->
        <component
          v-else-if="col.render"
          :is="col.render(scope.row[col.dataIndex], scope.row, scope.$index)"
        />

        <!-- 3. 基础文本兜底 (这里可以根据 valueType 引入更多的格式化逻辑，比如字典反显等) -->
        <span v-else>
          {{ formatValue(scope.row[col.dataIndex], col) }}
        </span>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import { useSlots } from 'vue';
import { ElTable, ElTableColumn } from 'element-plus';
import type { ProColumnType } from '@headless-pro-table/core';

const props = defineProps<{
  dataSource: any[];
  columns: ProColumnType<any>[];
  loading: boolean;
  rowSelection?: any;
  valueEnumMap?: Record<string, any>; // 我们可以在 Wrapper 中通过注入或 props 接受这个 Map
}>();

const emit = defineEmits(['update:selection', 'table-change']);
const slots = useSlots();

const handleSelectionChange = (selection: any[]) => {
  if (props.rowSelection?.onChange) {
    // 假设用 'id' 作为 key，真实情况可以根据 rowKey 获取
    const keys = selection.map(row => row.id || row.key);
    props.rowSelection.onChange(keys, selection);
  }
};

const handleSortChange = ({ prop, order }: any) => {
  // Element order: 'ascending' | 'descending' | null
  // 转换为 ProTable: 'ascend' | 'descend'
  const sorter = order ? { [prop]: order.replace('ing', 'end') } : {};
  emit('table-change', {}, {}, sorter);
};

const handleFilterChange = (filters: any) => {
  emit('table-change', {}, filters, {});
};

// 根据字典回显
const formatValue = (val: any, col: ProColumnType) => {
  if (col.valueEnum && props.valueEnumMap && props.valueEnumMap[col.dataIndex]) {
    const enumData = props.valueEnumMap[col.dataIndex];
    if (Array.isArray(enumData)) {
      const match = enumData.find((item: any) => item.value === val);
      return match ? match.label : val;
    } else if (typeof enumData === 'object') {
      return enumData[val]?.text || val;
    }
  }
  return val;
};
</script>
