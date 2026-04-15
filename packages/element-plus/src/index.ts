import { createProTable } from '@headless-pro-table/core';
import { ElForm, ElFormItem, ElInput, ElPagination, ElButton, ElDatePicker } from 'element-plus';
import ElementTableWrapper from './ElementTableWrapper.vue';
import ElementSelectWrapper from './ElementSelectWrapper.vue';

export const ElementProTable = createProTable({
  Table: ElementTableWrapper,
  Form: {
    component: ElForm,
    mapProps: (props: any) => ({
      model: props.model,
      inline: true,
      labelPosition: 'right',
    })
  },
  FormItem: {
    component: ElFormItem,
    mapProps: (props: any) => ({
      label: props.label,
      prop: props.prop,
    })
  },
  Pagination: {
    component: ElPagination,
    mapProps: (props: any) => ({
      'current-page': props.current,
      'page-size': props.pageSize,
      total: props.total,
      layout: 'total, sizes, prev, pager, next, jumper',
      'onUpdate:current-page': (val: number) => props.onChange(val, props.pageSize),
      'onUpdate:page-size': (val: number) => props.onChange(props.current, val),
    })
  },
  Button: ElButton,
  
  // Fields Mapping based on `valueType`
  text: {
    component: ElInput,
    mapProps: (props: any) => ({
      modelValue: props.value,
      'onUpdate:modelValue': props.onChange,
      clearable: true,
      placeholder: '请输入',
    })
  },
  select: {
    component: ElementSelectWrapper,
    mapProps: (props: any) => ({
      value: props.value,
      'onUpdate:value': props.onChange,
      options: props.options,
      loading: props.loading,
    })
  },
  date: {
    component: ElDatePicker,
    mapProps: (props: any) => ({
      modelValue: props.value,
      'onUpdate:modelValue': props.onChange,
      type: 'date',
      placeholder: '请选择日期',
      valueFormat: 'YYYY-MM-DD',
      clearable: true,
    })
  }
});

export default ElementProTable;
