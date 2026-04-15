import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { createProTable } from '../src/createProTable';

// Dummy Components for Registry
const DummyTable = defineComponent({
  props: ['dataSource', 'columns', 'loading'],
  setup(props, { slots }) {
    return () => h('div', { class: 'dummy-table' }, [
      h('div', { class: 'dummy-table-data' }, JSON.stringify(props.dataSource)),
      slots.default?.()
    ]);
  }
});

const DummyForm = defineComponent({
  props: ['model'],
  setup(props, { slots }) {
    return () => h('div', { class: 'dummy-form' }, slots.default?.());
  }
});

const DummyFormItem = defineComponent({
  props: ['label', 'prop'],
  setup(props, { slots }) {
    return () => h('div', { class: 'dummy-form-item' }, slots.default?.());
  }
});

const DummyInput = defineComponent({
  props: ['value'],
  setup(props, { emit }) {
    return () => h('input', { 
      class: 'dummy-input', 
      value: props.value,
      onInput: (e: any) => emit('change', e.target.value)
    });
  }
});

const DummyButton = defineComponent({
  setup(props, { slots, attrs }) {
    return () => h('button', { ...attrs, class: 'dummy-button' }, slots.default?.());
  }
});

const DummyPagination = defineComponent({
  props: ['current', 'pageSize', 'total'],
  setup(props) {
    return () => h('div', { class: 'dummy-pagination' }, `Page ${props.current} of ${props.total}`);
  }
});

// Create a Dummy ProTable
const DummyProTable = createProTable({
  Table: DummyTable,
  Form: DummyForm,
  FormItem: DummyFormItem,
  Input: DummyInput,
  Button: DummyButton,
  Pagination: DummyPagination
});

describe('createProTable', () => {
  it('should render form, table and pagination based on registry', async () => {
    const request = vi.fn().mockResolvedValue({
      data: [{ id: 1, name: 'Alice' }],
      total: 1,
      success: true
    });

    const wrapper = mount(DummyProTable, {
      props: {
        request,
        columns: [
          { title: 'Name', dataIndex: 'name', valueType: 'text' }
        ],
        debounceTime: 0,
        pagination: { current: 1, pageSize: 10, total: 1 } // explicitly pass pagination props
      }
    });

    // 等待请求结束
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(wrapper.find('.dummy-form').exists()).toBe(true);
    expect(wrapper.find('.dummy-table').exists()).toBe(true);
    expect(wrapper.find('.dummy-pagination').exists()).toBe(true);

    expect(wrapper.find('.dummy-table-data').text()).toContain('Alice');
    expect(wrapper.find('.dummy-pagination').text()).toContain('Page 1 of 1');
  });

  it('should map props correctly if mapProps is provided', async () => {
    const MappedProTable = createProTable({
      Table: DummyTable,
      Form: DummyForm,
      FormItem: DummyFormItem,
      Button: DummyButton,
      Pagination: DummyPagination,
      Input: {
        component: DummyInput,
        mapProps: (props: any) => ({
          value: props.value ? props.value + '-mapped' : '',
          onChange: props.onChange
        })
      }
    });

    const request = vi.fn().mockResolvedValue({ data: [], success: true });

    const wrapper = mount(MappedProTable, {
      props: {
        request,
        columns: [
          { title: 'Name', dataIndex: 'name', initialValue: 'test' }
        ],
        debounceTime: 0
      }
    });

    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 检查 mapProps 是否生效
    const input = wrapper.find('.dummy-input');
    expect((input.element as HTMLInputElement).value).toBe('test-mapped');
  });

  it('should render custom form item via slots', async () => {
    const request = vi.fn().mockResolvedValue({ data: [], success: true });

    const wrapper = mount(DummyProTable, {
      props: {
        request,
        columns: [
          { title: 'Name', dataIndex: 'name' }
        ],
        debounceTime: 0
      },
      slots: {
        'form-name': '<div class="custom-slot-form-name">Custom Form Name</div>'
      }
    });

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(wrapper.find('.custom-slot-form-name').exists()).toBe(true);
  });
});
