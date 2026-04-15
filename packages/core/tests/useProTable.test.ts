import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { useProTable } from '../src/useProTable';
import type { UseProTableOptions } from '../src/types';

// 测试辅助函数，在组件环境中执行 Composable
function mountComposable<T, U>(options: UseProTableOptions<T, U>) {
  let result: ReturnType<typeof useProTable> | undefined;
  
  const TestComponent = defineComponent({
    setup() {
      result = useProTable(options);
      return () => null;
    }
  });

  const wrapper = mount(TestComponent);
  
  if (!result) {
    throw new Error('useProTable failed to initialize');
  }

  return { result, wrapper };
}

// 模拟等待 promises 解决
const flushPromises = () => new Promise(resolve => process.nextTick(resolve));

describe('useProTable core logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should fetch data on mount by default', async () => {
    const request = vi.fn().mockResolvedValue({ data: [{ id: 1 }], success: true, total: 10 });
    const { result } = mountComposable({ request, debounceTime: 0 });

    expect(result.loading.value).toBe(true);
    
    // 执行内部 debounce 定时器
    vi.runAllTimers();
    await flushPromises();

    expect(request).toHaveBeenCalledTimes(1);
    expect(result.dataSource.value).toEqual([{ id: 1 }]);
    expect(result.pagination.total).toBe(10);
    expect(result.loading.value).toBe(false);
  });

  it('should not fetch data on mount if manual is true', async () => {
    const request = vi.fn().mockResolvedValue({ data: [], success: true, total: 0 });
    const { result } = mountComposable({ request, manual: true, debounceTime: 0 });

    vi.runAllTimers();
    await flushPromises();

    expect(request).not.toHaveBeenCalled();
    expect(result.loading.value).toBe(false);
  });

  it('should trigger fetch when pagination changes', async () => {
    const request = vi.fn().mockResolvedValue({ data: [], success: true, total: 0 });
    const { result } = mountComposable({ request, manual: true, debounceTime: 0 });

    result.onPaginationChange(2, 20);
    
    await nextTick();
    vi.runAllTimers();
    await flushPromises();

    expect(request).toHaveBeenCalledTimes(1);
    const callArgs = request.mock.calls[0][0];
    expect(callArgs.current).toBe(2);
    expect(callArgs.pageSize).toBe(20);
  });

  it('should support search model with initialValue', async () => {
    const request = vi.fn().mockResolvedValue({ data: [], success: true, total: 0 });
    const { result } = mountComposable({ 
      request, 
      manual: true, 
      debounceTime: 0,
      columns: [
        { title: 'Status', dataIndex: 'status', initialValue: 'active' },
        { title: 'Name', dataIndex: 'name' }
      ]
    });

    expect(result.searchModel.status).toBe('active');
    expect(result.searchModel.name).toBeUndefined();

    result.action.reload();
    
    vi.runAllTimers();
    await flushPromises();

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0].status).toBe('active');
  });

  it('should debounce rapid requests', async () => {
    const request = vi.fn().mockResolvedValue({ data: [], success: true, total: 0 });
    const { result } = mountComposable({ request, manual: true, debounceTime: 50 });

    result.action.reload();
    result.action.reload();
    result.action.reload();

    vi.advanceTimersByTime(50);
    await flushPromises();

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should intercept params with beforeSearchSubmit', async () => {
    const request = vi.fn().mockResolvedValue({ data: [], success: true, total: 0 });
    const beforeSearchSubmit = vi.fn((params) => ({ ...params, extra: true }));
    
    const { result } = mountComposable({ request, manual: true, debounceTime: 0, beforeSearchSubmit });

    result.action.reload();
    
    vi.runAllTimers();
    await flushPromises();

    expect(beforeSearchSubmit).toHaveBeenCalled();
    expect(request.mock.calls[0][0].extra).toBe(true);
  });

  it('should preserve selected row keys across pages', async () => {
    const request = vi.fn().mockResolvedValue({ data: [], success: true, total: 0 });
    const { result } = mountComposable({ 
      request, 
      manual: true, 
      preserveSelectedRowKeys: true,
      rowKey: 'id'
    });

    // 模拟第一页数据
    result.dataSource.value = [{ id: 1 }, { id: 2 }];
    
    // 用户选中了第一页的项 (假设底层 UI 传回了选中的 keys 和 rows)
    result.onRowSelectionChange([1], [{ id: 1 }]);
    expect(result.selectedRowKeys.value).toEqual([1]);
    
    // 模拟第二页数据
    result.dataSource.value = [{ id: 3 }, { id: 4 }];
    
    // 用户选中了第二页的项 (此时底层 UI 只知道当前页选中的是 3)
    result.onRowSelectionChange([3], [{ id: 3 }]);
    
    // 由于 preserveSelectedRowKeys: true，最终选中项应该包含 1 和 3
    expect(result.selectedRowKeys.value).toContain(1);
    expect(result.selectedRowKeys.value).toContain(3);
    expect(result.selectedRows.value).toEqual([{ id: 1 }, { id: 3 }]);
  });

  it('should format date correctly', async () => {
    const request = vi.fn().mockResolvedValue({ data: [], success: true });
    const dateObj = new Date(2023, 0, 1);
    
    const { result } = mountComposable({ 
      request, 
      manual: true, 
      debounceTime: 0,
      columns: [
        { title: 'Date 1', dataIndex: 'date1', valueType: 'date', dateFormatter: 'YYYY-MM-DD' },
        { title: 'Date 2', dataIndex: 'date2', valueType: 'dateTime', dateFormatter: 'number' },
        { title: 'Date 3', dataIndex: 'date3', valueType: 'date', dateFormatter: (v: any) => 'custom-' + v.getFullYear() },
      ]
    });

    result.searchModel.date1 = dateObj;
    result.searchModel.date2 = dateObj;
    result.searchModel.date3 = dateObj;

    result.action.reload();
    vi.runAllTimers();
    await flushPromises();

    expect(request).toHaveBeenCalledTimes(1);
    const params = request.mock.calls[0][0];
    expect(params.date1).toBe('2023-01-01');
    expect(params.date2).toBe(dateObj.getTime());
    expect(params.date3).toBe('custom-2023');
  });

  it('should handle polling correctly', async () => {
    const request = vi.fn().mockResolvedValue({ data: [], success: true });
    const { result, wrapper } = mountComposable({ 
      request, 
      polling: 1000,
      debounceTime: 0
    });

    // mount request
    vi.runAllTimers();
    await flushPromises();
    expect(request).toHaveBeenCalledTimes(1);

    // wait for polling
    vi.advanceTimersByTime(1000);
    await flushPromises();
    expect(request).toHaveBeenCalledTimes(2);

    // wait for another polling
    vi.advanceTimersByTime(1000);
    await flushPromises();
    expect(request).toHaveBeenCalledTimes(3);

    // unmount should clear timers
    wrapper.unmount();
    vi.advanceTimersByTime(1000);
    await flushPromises();
    expect(request).toHaveBeenCalledTimes(3); // should not increase
  });

  it('should handle onTableChange correctly', async () => {
    const request = vi.fn().mockResolvedValue({ data: [], success: true });
    const { result } = mountComposable({ request, manual: true, debounceTime: 0 });

    result.onTableChange(
      { current: 2, pageSize: 20 },
      { status: ['active'] },
      { field: 'age', order: 'descend' }
    );

    // wait for internal logic to trigger fetch
    vi.runAllTimers();
    await flushPromises();

    // The fetch might be called once or twice depending on how the reactive updates batch.
    // We just need to check the last call args.
    const lastCallIndex = request.mock.calls.length - 1;
    const params = request.mock.calls[lastCallIndex][0];
    const sorter = request.mock.calls[lastCallIndex][1];
    const filter = request.mock.calls[lastCallIndex][2];

    expect(params.current).toBe(2);
    expect(params.pageSize).toBe(20);
    expect(filter).toEqual({ status: ['active'] });
    expect(sorter).toEqual({ age: 'descend' });
  });

  it('should catch request errors and call onRequestError', async () => {
    const error = new Error('Network error');
    const request = vi.fn().mockRejectedValue(error);
    const onRequestError = vi.fn();
    
    const { result } = mountComposable({ request, manual: true, debounceTime: 0, onRequestError });

    result.action.reload();
    vi.runAllTimers();
    await flushPromises();

    expect(onRequestError).toHaveBeenCalledWith(error);
    expect(result.loading.value).toBe(false);
  });

  it('should handle form dependencies linkage', async () => {
    const request = vi.fn().mockResolvedValue({ data: [], success: true });
    const valueEnumFn = vi.fn().mockResolvedValue([]);
    
    const { result } = mountComposable({ 
      request, 
      manual: true, 
      debounceTime: 0,
      columns: [
        { title: 'Role', dataIndex: 'role' },
        { 
          title: 'Status', 
          dataIndex: 'status', 
          dependencies: ['role'],
          valueEnum: valueEnumFn
        }
      ]
    });

    result.searchModel.status = 'active';
    result.searchModel.role = 'admin';

    // nextTick allows the watcher to trigger
    await flushPromises();

    expect(result.searchModel.status).toBeUndefined(); // status should be cleared because role changed
    expect(valueEnumFn).toHaveBeenCalledTimes(2); // once on init, once on dependency change
  });

  it('should apply postData to modify response', async () => {
    const request = vi.fn().mockResolvedValue({ data: [{ id: 1 }], success: true });
    const postData = vi.fn((data) => data.map((item: any) => ({ ...item, modified: true })));
    
    const { result } = mountComposable({ request, manual: true, debounceTime: 0, postData });

    result.action.reload();
    vi.runAllTimers();
    await flushPromises();

    expect(postData).toHaveBeenCalledWith([{ id: 1 }]);
    expect(result.dataSource.value).toEqual([{ id: 1, modified: true }]);
  });
});
