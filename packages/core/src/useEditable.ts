import { ref, unref, computed, Ref } from 'vue';
import type { EditableConfig } from './types';

export function useEditable<T>(config?: EditableConfig<T>, rowKey: string | ((record: T) => string | number) = 'id') {
  // 维护内部状态，除非用户通过 config.editableKeys 控制
  const internalEditableKeys = ref<(string | number)[]>([]);
  
  // 缓存正在编辑的原始行数据，用于取消时还原
  const originRowsCache = ref<Record<string | number, T>>({});
  // 缓存编辑中的草稿数据，防止污染原数据直至保存
  const draftRowsCache = ref<Record<string | number, Partial<T>>>({});

  const getRowKey = (record: T): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return (record as any)[rowKey as string];
  };

  const editableKeys = computed(() => {
    return unref(config?.editableKeys) || internalEditableKeys.value;
  });

  const isEditable = (record: T): boolean => {
    const key = getRowKey(record);
    return editableKeys.value.includes(key);
  };

  const startEditable = (record: T) => {
    const key = getRowKey(record);
    if (!editableKeys.value.includes(key)) {
      // 深度拷贝以防对象引用污染
      originRowsCache.value[key] = JSON.parse(JSON.stringify(record));
      draftRowsCache.value[key] = JSON.parse(JSON.stringify(record));
      
      const newKeys = [...editableKeys.value, key];
      internalEditableKeys.value = newKeys;
      config?.onChange?.(newKeys, [record]);
    }
  };

  const cancelEditable = async (record: T) => {
    const key = getRowKey(record);
    if (config?.onCancel) {
      const res = await config.onCancel(key, record, originRowsCache.value[key]);
      if (res === false) return; // 如果返回 false，拦截取消动作
    }
    
    const newKeys = editableKeys.value.filter(k => k !== key);
    internalEditableKeys.value = newKeys;
    
    delete originRowsCache.value[key];
    delete draftRowsCache.value[key];
    config?.onChange?.(newKeys, []);
  };

  const saveEditable = async (record: T, updatedRecord: T) => {
    const key = getRowKey(record);
    if (config?.onSave) {
      const res = await config.onSave(key, updatedRecord, originRowsCache.value[key]);
      if (res === false) return; // 校验失败拦截保存
    }
    
    const newKeys = editableKeys.value.filter(k => k !== key);
    internalEditableKeys.value = newKeys;
    
    delete originRowsCache.value[key];
    delete draftRowsCache.value[key];
    config?.onChange?.(newKeys, []);
  };

  const deleteRow = async (record: T) => {
    const key = getRowKey(record);
    if (config?.onDelete) {
      const res = await config.onDelete(key, record);
      if (res === false) return;
    }
  };

  return {
    editableKeys,
    isEditable,
    startEditable,
    cancelEditable,
    saveEditable,
    deleteRow,
    originRowsCache,
    draftRowsCache,
    getRowKey,
  };
}
