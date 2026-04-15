import { createProTable } from '@headless-pro-table/core';
import { Form, Input, Button, DatePicker, Pagination } from 'ant-design-vue';
import AntdTableWrapper from './AntdTableWrapper.vue';
import AntdSelectWrapper from './AntdSelectWrapper.vue';

export const AntdvProTable = createProTable({
  Table: AntdTableWrapper,
  Form: {
    component: Form,
    mapProps: (props: any) => ({
      model: props.model,
      layout: 'inline'
    })
  },
  FormItem: {
    component: Form.Item,
    mapProps: (props: any) => ({
      label: props.label,
      name: props.prop
    })
  },
  Pagination: {
    component: Pagination,
    mapProps: (props: any) => ({
      current: props.current,
      pageSize: props.pageSize,
      total: props.total,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total: number) => `共 ${total} 条`,
      onChange: (page: number, size: number) => props.onChange(page, size),
      onShowSizeChange: (page: number, size: number) => props.onChange(page, size)
    })
  },
  Button,
  text: {
    component: Input,
    mapProps: (props: any) => ({
      value: props.value,
      'onUpdate:value': props.onChange,
      allowClear: true,
      placeholder: '请输入'
    })
  },
  select: {
    component: AntdSelectWrapper,
    mapProps: (props: any) => ({
      value: props.value,
      'onUpdate:value': props.onChange,
      options: props.options,
      loading: props.loading
    })
  },
  date: {
    component: DatePicker,
    mapProps: (props: any) => ({
      value: props.value,
      'onUpdate:value': props.onChange,
      allowClear: true
    })
  }
});

export default AntdvProTable;

