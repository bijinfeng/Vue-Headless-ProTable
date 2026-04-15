import { ref, unref, Ref, watch } from 'vue';
import type { ProColumnType } from './types';

export function useValueEnum(columnsRef: Ref<ProColumnType<any>[]> | ProColumnType<any>[]) {
  const columns = unref(columnsRef);
  
  // 维护每个字段的 valueEnum 数据
  const valueEnumMap = ref<Record<string, any>>({});
  // 维护每个字段的 loading 状态
  const valueEnumLoadingMap = ref<Record<string, boolean>>({});

  const fetchValueEnum = async (col: ProColumnType<any>) => {
    if (!col.valueEnum) return;

    if (typeof col.valueEnum === 'function') {
      valueEnumLoadingMap.value[col.dataIndex] = true;
      try {
        const res = await col.valueEnum();
        valueEnumMap.value[col.dataIndex] = res;
      } catch (e) {
        console.error(`Fetch valueEnum error for ${col.dataIndex}`, e);
      } finally {
        valueEnumLoadingMap.value[col.dataIndex] = false;
      }
    } else {
      valueEnumMap.value[col.dataIndex] = col.valueEnum;
    }
  };

  const initValueEnums = () => {
    columns.forEach(col => {
      fetchValueEnum(col);
    });
  };

  initValueEnums();

  // 监听列配置变化，重新加载
  watch(() => unref(columnsRef), (newCols) => {
    newCols.forEach(col => {
      fetchValueEnum(col);
    });
  }, { deep: true, flush: 'sync' });

  return {
    valueEnumMap,
    valueEnumLoadingMap,
    fetchValueEnum,
  };
}
