import { describe, it, expect } from 'vitest';
import { ref, unref } from 'vue';
import { useColumnManager } from '../src/useColumnManager';
import type { ProColumnType } from '../src/types';

describe('useColumnManager', () => {
  it('should initialize columns state correctly', () => {
    const columns: ProColumnType[] = [
      { title: 'A', dataIndex: 'a' },
      { title: 'B', dataIndex: 'b', hideInTable: true },
      { title: 'C', dataIndex: 'c', fixed: 'left' },
      { title: 'D', dataIndex: 'd', order: 10 }
    ];

    const { columnsMap, displayColumns } = useColumnManager(columns);

    // B 应该被隐藏
    expect(columnsMap.value['a'].show).toBe(true);
    expect(columnsMap.value['b'].show).toBe(false);
    expect(columnsMap.value['c'].fixed).toBe('left');
    expect(columnsMap.value['d'].order).toBe(10);

    // displayColumns 应该排除了 B
    const displayed = unref(displayColumns);
    expect(displayed.length).toBe(3);
    expect(displayed.map(c => c.dataIndex)).not.toContain('b');

    // 验证 order 排序 (降序)
    // a 默认 order 4, b:3, c:2, d:10 (因为 d 有自定义 order)
    // d 应该在第一位
    expect(displayed[0].dataIndex).toBe('d');
  });

  it('should allow setting column visibility', () => {
    const columns = [{ title: 'A', dataIndex: 'a' }];
    const { displayColumns, setColumnVisibility } = useColumnManager(columns);

    expect(unref(displayColumns).length).toBe(1);
    
    setColumnVisibility('a', false);
    expect(unref(displayColumns).length).toBe(0);

    setColumnVisibility('a', true);
    expect(unref(displayColumns).length).toBe(1);
  });

  it('should allow setting column fixed and order', () => {
    const columns = [
      { title: 'A', dataIndex: 'a' },
      { title: 'B', dataIndex: 'b' }
    ];
    const { displayColumns, setColumnFixed, setColumnOrder } = useColumnManager(columns);

    setColumnFixed('a', 'right');
    expect(unref(displayColumns).find(c => c.dataIndex === 'a')?.fixed).toBe('right');

    setColumnOrder('b', 100); // b order 更高
    const displayed = unref(displayColumns);
    expect(displayed[0].dataIndex).toBe('b');
  });

  it('should allow reset columns to initial state', () => {
    const columns = [{ title: 'A', dataIndex: 'a' }];
    const { displayColumns, setColumnVisibility, resetColumns } = useColumnManager(columns);

    setColumnVisibility('a', false);
    expect(unref(displayColumns).length).toBe(0);

    resetColumns();
    expect(unref(displayColumns).length).toBe(1);
  });

  it('should react to external ref changes', async () => {
    const columns = ref([{ title: 'A', dataIndex: 'a' }]);
    const { displayColumns } = useColumnManager(columns);

    expect(unref(displayColumns).length).toBe(1);

    // 修改外部 ref
    columns.value = [{ title: 'A', dataIndex: 'a' }, { title: 'B', dataIndex: 'b' }];
    
    // Vue reactivity might need nextTick if we test inside components,
    // but in pure composition API, watch(..., { deep: true, flush: 'sync' }) or we just test the manual init.
    // However, the watch in useColumnManager is asynchronous by default. 
    // For unit tests without a component wrapper, we might need a tick.
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(unref(displayColumns).length).toBe(2);
  });
});
