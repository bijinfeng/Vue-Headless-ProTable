import { describe, it, expect, vi } from 'vitest';
import { ref, unref } from 'vue';
import { useValueEnum } from '../src/useValueEnum';
import type { ProColumnType } from '../src/types';

describe('useValueEnum', () => {
  it('should initialize static valueEnum correctly', () => {
    const columns: ProColumnType[] = [
      {
        title: 'Status',
        dataIndex: 'status',
        valueEnum: {
          active: { text: 'Active' },
          disabled: { text: 'Disabled' }
        }
      },
      {
        title: 'Role',
        dataIndex: 'role',
        valueEnum: [
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' }
        ]
      }
    ];

    const { valueEnumMap, valueEnumLoadingMap } = useValueEnum(columns);

    expect(valueEnumMap.value['status']).toEqual({
      active: { text: 'Active' },
      disabled: { text: 'Disabled' }
    });

    expect(valueEnumMap.value['role']).toEqual([
      { label: 'Admin', value: 'admin' },
      { label: 'User', value: 'user' }
    ]);

    // 静态数据没有 loading 状态
    expect(valueEnumLoadingMap.value['status']).toBeUndefined();
  });

  it('should handle async valueEnum correctly', async () => {
    const asyncEnum = vi.fn().mockResolvedValue({
      a: { text: 'A' },
      b: { text: 'B' }
    });

    const columns: ProColumnType[] = [
      {
        title: 'AsyncCol',
        dataIndex: 'asyncCol',
        valueEnum: asyncEnum
      }
    ];

    const { valueEnumMap, valueEnumLoadingMap } = useValueEnum(columns);

    // 初始状态应该为 loading: true，数据还没回来
    expect(valueEnumLoadingMap.value['asyncCol']).toBe(true);
    expect(valueEnumMap.value['asyncCol']).toBeUndefined();

    // 等待 Promise resolve
    await new Promise(resolve => process.nextTick(resolve));

    expect(asyncEnum).toHaveBeenCalledTimes(1);
    expect(valueEnumLoadingMap.value['asyncCol']).toBe(false);
    expect(valueEnumMap.value['asyncCol']).toEqual({
      a: { text: 'A' },
      b: { text: 'B' }
    });
  });

  it('should catch error in async valueEnum', async () => {
    const asyncEnum = vi.fn().mockRejectedValue(new Error('Network Error'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const columns: ProColumnType[] = [
      {
        title: 'ErrorCol',
        dataIndex: 'errorCol',
        valueEnum: asyncEnum
      }
    ];

    const { valueEnumMap, valueEnumLoadingMap } = useValueEnum(columns);

    expect(valueEnumLoadingMap.value['errorCol']).toBe(true);

    await new Promise(resolve => process.nextTick(resolve));

    expect(asyncEnum).toHaveBeenCalledTimes(1);
    expect(valueEnumLoadingMap.value['errorCol']).toBe(false);
    expect(valueEnumMap.value['errorCol']).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Fetch valueEnum error for errorCol', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('should refetch on column ref change', async () => {
    const columns = ref<ProColumnType[]>([
      {
        title: 'StaticCol',
        dataIndex: 'staticCol',
        valueEnum: { a: { text: 'A' } }
      }
    ]);

    const { valueEnumMap } = useValueEnum(columns);

    expect(valueEnumMap.value['staticCol']).toEqual({ a: { text: 'A' } });

    columns.value = [
      {
        title: 'StaticCol',
        dataIndex: 'staticCol',
        valueEnum: { b: { text: 'B' } }
      }
    ];

    // Vue reactivity for pure composition watch requires tick
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(valueEnumMap.value['staticCol']).toEqual({ b: { text: 'B' } });
  });
});
