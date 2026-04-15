import { ref, reactive, watch, onMounted, onUnmounted, computed, unref, Ref } from 'vue';
import type { UseProTableOptions, ProColumnType } from './types';
import { useColumnManager } from './useColumnManager';
import { useEditable } from './useEditable';
import { useValueEnum } from './useValueEnum';
import dayjs from 'dayjs';

export function useProTable<T, U = Record<string, any>>(options: UseProTableOptions<T, U>) {
  const { request, pagination: initPagination, manual = false, columns = [] } = options;

  const dataSource = ref<T[]>([]) as import('vue').Ref<T[]>;
  const loading = ref(false);
  const searchModel = reactive<Record<string, any>>({});
  
  // 提取 columns 中的 initialValue 并初始化 searchModel
  const initSearchModel = () => {
    columns.forEach(col => {
      if (col.initialValue !== undefined && searchModel[col.dataIndex] === undefined) {
        searchModel[col.dataIndex] = col.initialValue;
      }
    });
  };
  initSearchModel();
  
  // 表单折叠状态
  const formCollapsed = ref(options.search !== false ? options.search?.defaultCollapsed ?? true : false);
  const toggleFormCollapsed = () => {
    formCollapsed.value = !formCollapsed.value;
  };

  const pagination = reactive({
    current: (typeof initPagination === 'object' ? initPagination.defaultCurrent : 1) || 1,
    pageSize: (typeof initPagination === 'object' ? initPagination.defaultPageSize : 10) || 10,
    total: 0,
  });

  const selectedRowKeys = ref<(string | number)[]>([]);
  const selectedRows = ref<T[]>([]);
  
  // 跨页选中时，使用内部的 Set 存储所有选中的 Key
  const preserveSelectedKeysSet = ref<Set<string | number>>(new Set());
  const preserveSelectedRowsMap = ref<Map<string | number, T>>(new Map());

  // 表格内部的排序与过滤状态
  const sorter = ref<Record<string, 'ascend' | 'descend'>>({});
  const filter = ref<Record<string, (string | number)[]>>({});

  // 轮询定时器
  let pollingTimer: ReturnType<typeof setTimeout> | null = null;
  // 防抖定时器
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // 1. 集成 ColumnManager
  const columnManager = useColumnManager(columns);

  // 2. 集成 Editable
  const editable = useEditable(options.editable, options.rowKey);

  // 3. 集成 ValueEnum (处理异步字典)
  const { valueEnumMap, valueEnumLoadingMap, fetchValueEnum } = useValueEnum(columns);

  // 表单联动逻辑处理 (Form Linkages)
  const initFormLinkages = () => {
    columns.forEach(col => {
      if (col.dependencies && col.dependencies.length > 0) {
        watch(
          () => col.dependencies!.map(dep => searchModel[dep]),
          (newVals, oldVals) => {
            // 当依赖项发生变化时
            const hasChanged = newVals.some((val, idx) => val !== oldVals[idx]);
            if (hasChanged) {
              // 1. 清空当前字段的值
              searchModel[col.dataIndex] = undefined;
              // 2. 如果存在异步的 valueEnum，重新触发请求
              if (typeof col.valueEnum === 'function') {
                fetchValueEnum(col);
              }
            }
          },
          { deep: true }
        );
      }
    });
  };

  // 在组件挂载前或配置初始化时调用联动
  initFormLinkages();

  // 提取可以搜索的列
  const searchableColumns = computed(() => {
    return columns.filter(col => col.hideInSearch !== true && col.search !== false);
  });

  const tableColumns = computed(() => {
    return columnManager.displayColumns.value;
  });

  // 日期格式化内部工具
  const formatDate = (val: any, formatter: any) => {
    if (!val) return val;
    // 如果是自定义函数
    if (typeof formatter === 'function') {
      return formatter(val);
    }
    // 简单的 Date 对象格式化兜底或 dayjs 格式化
    if (val instanceof Date || (typeof val === 'object' && val !== null && (val as any).isDayjs === true)) {
      if (formatter === 'number') return dayjs(val).valueOf();
      if (formatter === 'string' || typeof formatter === 'string') {
        const defaultFormat = typeof formatter === 'string' && formatter !== 'string' ? formatter : 'YYYY-MM-DD';
        return dayjs(val).format(defaultFormat);
      }
      return dayjs(val).toISOString();
    }
    return val;
  };

  const runFetchData = async () => {
    if (!request) return;
    loading.value = true;
    try {
      const extraParams = typeof options.params === 'function' 
        ? (options.params as any)() 
        : unref(options.params as Ref<U>) || {};

      const parsedSearchParams = JSON.parse(JSON.stringify(searchModel));

      columns.forEach(col => {
        let val = parsedSearchParams[col.dataIndex];
        // 如果 parsed 中不存在，从原始 searchModel 中取，避免 JSON.stringify 把 Date 对象转成了 string
        if (val !== undefined && searchModel[col.dataIndex] instanceof Date) {
          val = searchModel[col.dataIndex];
        }
        
        if (val !== undefined && val !== null && val !== '') {
          if ((col.valueType === 'date' || col.valueType === 'dateTime') && col.dateFormatter !== false) {
            const formatter = col.dateFormatter ?? options.dateFormatter ?? 'string';
            if (Array.isArray(val)) {
              parsedSearchParams[col.dataIndex] = val.map(v => formatDate(v, formatter));
            } else {
              parsedSearchParams[col.dataIndex] = formatDate(val, formatter);
            }
          }
          if (col.search && col.search.transform) {
            const transformed = col.search.transform(parsedSearchParams[col.dataIndex]);
            if (typeof transformed === 'object' && transformed !== null) {
              Object.assign(parsedSearchParams, transformed);
              delete parsedSearchParams[col.dataIndex];
            } else {
              parsedSearchParams[col.dataIndex] = transformed;
            }
          }
        }
      });

      let finalSearchParams = parsedSearchParams;
      if (options.search !== false && options.search?.transform) {
        finalSearchParams = options.search.transform(parsedSearchParams);
      }
      
      // 触发 beforeSearchSubmit 生命周期钩子
      if (options.beforeSearchSubmit) {
        finalSearchParams = options.beforeSearchSubmit(finalSearchParams) || finalSearchParams;
      }

      const finalParams = {
        ...finalSearchParams,
        ...extraParams,
        current: pagination.current,
        pageSize: pagination.pageSize,
      } as unknown as U & { current: number; pageSize: number };

      // 将 sorter 和 filter 透传
      const res = await request(finalParams, unref(sorter), unref(filter));
      
      if (res.success) {
        // 如果有 postData，则对响应数据进行处理
        let finalData = res.data;
        if (options.postData) {
          finalData = options.postData(finalData);
        }
        dataSource.value = finalData;
        pagination.total = res.total || 0;
      }
    } catch (e: any) {
      if (options.onRequestError) {
        options.onRequestError(e);
      } else {
        console.error('ProTable Fetch Error:', e);
      }
    } finally {
      loading.value = false;
      
      // 如果配置了轮询，在请求完成后再次启动定时器
      if (options.polling && options.polling > 0) {
        pollingTimer = setTimeout(() => {
          fetchData();
        }, options.polling);
      }
    }
  };

  const fetchData = () => {
    // 处理防抖逻辑
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // 如果存在正在进行的轮询，先清除以防止重叠
    if (pollingTimer) {
      clearTimeout(pollingTimer);
      pollingTimer = null;
    }

    const debounceTime = options.debounceTime ?? 10;
    
    if (debounceTime > 0) {
      debounceTimer = setTimeout(() => {
        runFetchData();
      }, debounceTime);
    } else {
      runFetchData();
    }
  };

  const action = {
    reload: (resetPageIndex?: boolean) => {
      if (resetPageIndex) {
        pagination.current = 1;
      }
      fetchData();
    },
    reset: () => {
      Object.keys(searchModel).forEach(key => delete searchModel[key]);
      initSearchModel(); // 恢复 initialValue
      pagination.current = 1;
      sorter.value = {};
      filter.value = {};
      fetchData();
    },
    clearSelected: () => {
      selectedRowKeys.value = [];
      selectedRows.value = [];
      preserveSelectedKeysSet.value.clear();
      preserveSelectedRowsMap.value.clear();
    }
  };

  // 分页改变时自动请求
  watch([() => pagination.current, () => pagination.pageSize], () => {
    fetchData();
  });

  // 高级轮询控制：监听页面可见性
  const handleVisibilityChange = () => {
    if (document.hidden) {
      if (pollingTimer) {
        clearTimeout(pollingTimer);
        pollingTimer = null;
      }
    } else {
      if (options.polling && options.polling > 0) {
        fetchData();
      }
    }
  };

  onMounted(() => {
    if (!manual) {
      fetchData();
    }
    if (options.polling) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  });

  onUnmounted(() => {
    if (pollingTimer) clearTimeout(pollingTimer);
    if (debounceTimer) clearTimeout(debounceTimer);
    if (options.polling) {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  });

  const updateSearchModel = (field: string, value: any) => {
    searchModel[field] = value;
  };

  const onPaginationChange = (current: number, pageSize: number) => {
    pagination.current = current;
    pagination.pageSize = pageSize;
  };

  // 选择行处理（支持跨页）
  const onRowSelectionChange = (keys: (string | number)[], rows: T[]) => {
    if (options.preserveSelectedRowKeys) {
      // 获取当前页的所有 key
      const getRowKey = (record: T) => {
        if (typeof options.rowKey === 'function') {
          return options.rowKey(record);
        }
        return (record as any)[options.rowKey || 'id'];
      };
      
      const currentPageKeys = dataSource.value.map(getRowKey);
      
      // 先移除当前页中所有未选中的 key
      currentPageKeys.forEach(key => {
        if (!keys.includes(key)) {
          preserveSelectedKeysSet.value.delete(key);
          preserveSelectedRowsMap.value.delete(key);
        }
      });
      
      // 再添加当前页新选中的 key
      keys.forEach((key, index) => {
        preserveSelectedKeysSet.value.add(key);
        preserveSelectedRowsMap.value.set(key, rows[index] as any);
      });
      
      selectedRowKeys.value = Array.from(preserveSelectedKeysSet.value);
      selectedRows.value = Array.from(preserveSelectedRowsMap.value.values()) as any;
    } else {
      selectedRowKeys.value = keys;
      selectedRows.value = rows;
    }
    
    options.rowSelection?.onChange?.(selectedRowKeys.value, selectedRows.value as unknown as T[]);
  };

  // 表格内部 onChange (支持分页、排序、过滤联动)
  const onTableChange = (
    newPagination: any,
    newFilter: Record<string, (string | number)[]>,
    newSorter: any
  ) => {
    let shouldFetch = false;
    
    // 适配 Antd 等 UI 框架抛出的事件
    if (newPagination && newPagination.current) {
      if (pagination.current !== newPagination.current || pagination.pageSize !== newPagination.pageSize) {
        pagination.current = newPagination.current;
        pagination.pageSize = newPagination.pageSize || pagination.pageSize;
        shouldFetch = true;
      }
    }
    
    if (newFilter) {
      // 简单判断 filter 是否有变化
      if (JSON.stringify(filter.value) !== JSON.stringify(newFilter)) {
        filter.value = newFilter;
        shouldFetch = true;
      }
    }
    
    if (newSorter) {
      // 简单处理单列排序，如果是多列可以进一步映射
      let parsedSorter: any = {};
      if (Array.isArray(newSorter)) {
        parsedSorter = newSorter.length > 0 ? { [newSorter[0].field]: newSorter[0].order } : {};
      } else if (newSorter.field) {
        parsedSorter = { [newSorter.field]: newSorter.order };
      } else {
        parsedSorter = newSorter;
      }
      
      if (JSON.stringify(sorter.value) !== JSON.stringify(parsedSorter)) {
        sorter.value = parsedSorter;
        shouldFetch = true;
      }
    }
    
    if (shouldFetch) {
      // 在 nextTick 或者直接防抖中获取，由于 onTableChange 可能同步被触发多次（某些 UI 库行为）
      // 这里直接交由 fetchData 去进行防抖处理
      fetchData();
    }
  };

  return {
    dataSource,
    loading,
    pagination,
    searchModel,
    searchableColumns,
    tableColumns,
    action,
    selectedRowKeys,
    selectedRows,
    onRowSelectionChange,
    updateSearchModel,
    onPaginationChange,
    onTableChange,
    
    // 高级扩展
    columnManager,
    editable,
    formCollapsed,
    toggleFormCollapsed,
    valueEnumMap,
    valueEnumLoadingMap,
  };
}
