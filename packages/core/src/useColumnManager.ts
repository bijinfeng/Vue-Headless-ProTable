import { ref, computed, watch, unref, Ref } from 'vue';
import type { ProColumnType } from './types';

export interface ColumnState {
  show?: boolean;
  fixed?: 'left' | 'right' | boolean;
  order?: number;
}

export function useColumnManager<T>(columnsRef: Ref<ProColumnType<T>[]> | ProColumnType<T>[]) {
  const initialColumns = unref(columnsRef);
  
  // 内部维护一个列状态 Map (以 dataIndex 为 key)
  const columnsMap = ref<Record<string, ColumnState>>({});

  // 初始化状态
  const init = () => {
    const map: Record<string, ColumnState> = {};
    initialColumns.forEach((col, index) => {
      map[col.dataIndex] = {
        show: col.hideInTable !== true,
        fixed: col.fixed,
        order: col.order ?? (initialColumns.length - index), // 默认 order 保持原序 (index 小的 order 大)
      };
    });
    columnsMap.value = map;
  };

  init();

  // 监听外部 columns 变化并重新初始化（如果需要支持外部动态列）
  // 简单处理：仅在 mount 时或外部 ref 变化时执行
  watch(() => unref(columnsRef), () => {
    init();
  }, { deep: true });

  // 计算最终显示的列，支持排序和过滤
  const displayColumns = computed(() => {
    const cols = unref(columnsRef);
    return cols
      .filter(col => columnsMap.value[col.dataIndex]?.show !== false)
      .map(col => ({
        ...col,
        fixed: columnsMap.value[col.dataIndex]?.fixed ?? col.fixed,
        order: columnsMap.value[col.dataIndex]?.order ?? col.order,
      }))
      .sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderB - orderA; // 降序，order 大的在前面
      });
  });

  const setColumnVisibility = (dataIndex: string, show: boolean) => {
    if (columnsMap.value[dataIndex]) {
      columnsMap.value[dataIndex].show = show;
    }
  };

  const setColumnFixed = (dataIndex: string, fixed: 'left' | 'right' | boolean | undefined) => {
    if (columnsMap.value[dataIndex]) {
      columnsMap.value[dataIndex].fixed = fixed;
    }
  };

  const setColumnOrder = (dataIndex: string, order: number) => {
    if (columnsMap.value[dataIndex]) {
      columnsMap.value[dataIndex].order = order;
    }
  };

  const resetColumns = () => {
    init();
  };

  return {
    columnsMap,
    displayColumns,
    setColumnVisibility,
    setColumnFixed,
    setColumnOrder,
    resetColumns,
  };
}
