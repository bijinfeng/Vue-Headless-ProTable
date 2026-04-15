<template>
  <a-table
    :columns="antdColumns"
    :data-source="dataSource"
    :loading="loading"
    :row-key="rowKey"
    :pagination="false"
    :row-selection="rowSelection"
    @change="handleChange"
    v-bind="$attrs"
  >
    <template #bodyCell="{ column, record, text, index }">
      <slot
        v-if="$slots[`cell-${String(column.dataIndex)}`]"
        :name="`cell-${String(column.dataIndex)}`"
        :record="record"
        :column="findProColumn(String(column.dataIndex))"
        :text="text"
        :index="index"
      />
      <component
        v-else-if="findProColumn(String(column.dataIndex))?.render"
        :is="findProColumn(String(column.dataIndex))!.render!(text, record, index)"
      />
      <span v-else>
        {{ formatValue(text, String(column.dataIndex)) }}
      </span>
    </template>
  </a-table>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ProColumnType } from '@headless-pro-table/core';

const props = defineProps<{
  dataSource: any[];
  columns: ProColumnType<any>[];
  loading: boolean;
  rowKey?: string | ((record: any) => string | number);
  rowSelection?: any;
  onTableChange?: (pagination: any, filters: any, sorter: any) => void;
  valueEnumMap?: Record<string, any>;
}>();

const findProColumn = (dataIndex: string) => {
  return props.columns.find((c) => c.dataIndex === dataIndex);
};

const antdColumns = computed(() => {
  return props.columns.map((c) => ({
    title: c.title,
    dataIndex: c.dataIndex,
    key: c.dataIndex,
    fixed: c.fixed === true ? undefined : c.fixed,
    sorter: c.sorter ? true : false
  }));
});

const handleChange = (pagination: any, filters: any, sorter: any) => {
  props.onTableChange?.(pagination, filters, sorter);
};

const formatValue = (val: any, dataIndex: string) => {
  const col = findProColumn(dataIndex);
  if (!col?.valueEnum || !props.valueEnumMap) return val;
  const enumData = props.valueEnumMap[dataIndex];
  if (!enumData) return val;
  if (Array.isArray(enumData)) {
    const match = enumData.find((item: any) => item.value === val);
    return match ? match.label : val;
  }
  if (typeof enumData === 'object') {
    return enumData[val]?.text ?? val;
  }
  return val;
};
</script>

