import { defineComponent, h, PropType } from 'vue';
import { useProTable } from './useProTable';
import type { UseProTableOptions, ProColumnType, UIAdapterRegistry } from './types';

export function createProTable(registry: UIAdapterRegistry) {
  return defineComponent({
    name: 'ProTable',
    props: {
      request: { type: Function as PropType<UseProTableOptions<any, any>['request']>, required: true },
      columns: { type: Array as PropType<ProColumnType<any>[]>, default: () => [] },
      params: { type: [Object, Function] as PropType<UseProTableOptions<any, any>['params']> },
      pagination: { type: [Boolean, Object] as PropType<UseProTableOptions<any, any>['pagination']> },
      manual: { type: Boolean, default: false },
      polling: { type: Number as PropType<UseProTableOptions<any, any>['polling']> },
      debounceTime: { type: Number as PropType<UseProTableOptions<any, any>['debounceTime']> },
      preserveSelectedRowKeys: { type: Boolean as PropType<UseProTableOptions<any, any>['preserveSelectedRowKeys']> },
      rowSelection: { type: Object as PropType<UseProTableOptions<any, any>['rowSelection']> },
      rowKey: { type: [String, Function] as PropType<UseProTableOptions<any, any>['rowKey']> },
      search: { type: [Boolean, Object] as PropType<UseProTableOptions<any, any>['search']> },
      editable: { type: Object as PropType<UseProTableOptions<any, any>['editable']> },
      dateFormatter: { type: [String, Boolean] as PropType<UseProTableOptions<any, any>['dateFormatter']> },
      beforeSearchSubmit: { type: Function as PropType<UseProTableOptions<any, any>['beforeSearchSubmit']> },
      postData: { type: Function as PropType<UseProTableOptions<any, any>['postData']> },
      onRequestError: { type: Function as PropType<UseProTableOptions<any, any>['onRequestError']> }
    },
    setup(props, { slots }) {
      const state = useProTable(props);

      const getAdapter = (type: string) => {
        const adapter = registry[type] || registry['Input']; // fallback to Input
        if (adapter && adapter.component) {
          return adapter;
        }
        return { component: adapter }; // If just raw component registered
      };

      const renderForm = () => {
        if (!state.searchableColumns.value.length) return null;
        
        const FormAdapter = getAdapter('Form');
        const FormItemAdapter = getAdapter('FormItem');
        const ButtonAdapter = getAdapter('Button');

        return h('div', { class: 'pro-table-search' }, [
          h(FormAdapter.component, FormAdapter.mapProps ? FormAdapter.mapProps({ model: state.searchModel }) : { model: state.searchModel }, () => {
            return [
              ...state.searchableColumns.value.map(col => {
                return h(FormItemAdapter.component, FormItemAdapter.mapProps ? FormItemAdapter.mapProps({ label: col.title, prop: col.dataIndex }) : { label: col.title, prop: col.dataIndex }, () => {
                  
                  // 1. 优先外部插槽
                  if (slots[`form-${col.dataIndex}`]) {
                    return slots[`form-${col.dataIndex}`]!({ model: state.searchModel, field: col.dataIndex });
                  }
                  
                  // 2. 其次 renderFormItem
                  if (col.renderFormItem) {
                    return col.renderFormItem(state.searchModel, col.dataIndex);
                  }

                  // 3. 根据 valueType 找到对应组件
                  const FieldAdapter = getAdapter(col.valueType || 'Input');
                  const fieldProps = {
                    value: state.searchModel[col.dataIndex],
                    onChange: (val: any) => state.updateSearchModel(col.dataIndex, val),
                    options: state.valueEnumMap.value[col.dataIndex],
                    loading: state.valueEnumLoadingMap.value[col.dataIndex]
                  };

                  return h(FieldAdapter.component, FieldAdapter.mapProps ? FieldAdapter.mapProps(fieldProps) : fieldProps);
                });
              }),
              h(FormItemAdapter.component, null, () => [
                h(ButtonAdapter.component, { type: 'primary', onClick: () => state.action.reload() }, () => '查询'),
                h(ButtonAdapter.component, { style: 'margin-left: 8px', onClick: () => state.action.reset() }, () => '重置')
              ])
            ];
          })
        ]);
      };

      const renderTable = () => {
        const TableAdapter = getAdapter('Table');
        
        // 传递标准 Props 到 Table 适配器
        const tableProps = {
          dataSource: state.dataSource.value,
          columns: state.tableColumns.value,
          loading: state.loading.value,
          rowSelection: props.rowSelection
            ? {
                ...props.rowSelection,
                selectedRowKeys: state.selectedRowKeys.value,
                onChange: state.onRowSelectionChange
              }
            : undefined,
          onTableChange: state.onTableChange,
          valueEnumMap: state.valueEnumMap.value,
        };

        const mappedProps = TableAdapter.mapProps ? TableAdapter.mapProps(tableProps) : tableProps;

        // 透传插槽
        return h('div', { class: 'pro-table-body', style: 'margin-top: 16px' }, [
          h(TableAdapter.component, mappedProps, slots)
        ]);
      };

      const renderPagination = () => {
        if (props.pagination === false) return null;

        const PaginationAdapter = getAdapter('Pagination');
        const paginationProps = {
          current: state.pagination.current,
          pageSize: state.pagination.pageSize,
          total: state.pagination.total,
          onChange: state.onPaginationChange
        };

        const mappedProps = PaginationAdapter.mapProps ? PaginationAdapter.mapProps(paginationProps) : paginationProps;

        return h('div', { class: 'pro-table-pagination', style: 'margin-top: 16px; text-align: right' }, [
          h(PaginationAdapter.component, mappedProps)
        ]);
      };

      return () => h('div', { class: 'headless-pro-table' }, [
        renderForm(),
        renderTable(),
        renderPagination()
      ]);
    }
  });
}
