import { describe, it, expect, vi } from 'vitest';
import { useEditable } from '../src/useEditable';

describe('useEditable', () => {
  const rowKeyFn = (record: any) => record.uuid;

  it('should initialize correctly and check if row is editable', () => {
    const { editableKeys, isEditable, getRowKey } = useEditable(undefined, 'id');
    
    expect(editableKeys.value).toEqual([]);
    expect(isEditable({ id: 1 })).toBe(false);
    expect(getRowKey({ id: 1 })).toBe(1);

    // 测试函数形式的 rowKey
    const { getRowKey: getRowKeyFn } = useEditable(undefined, rowKeyFn);
    expect(getRowKeyFn({ uuid: 'abc' })).toBe('abc');
  });

  it('should start editable correctly and cache original row', () => {
    const onChange = vi.fn();
    const { editableKeys, startEditable, isEditable, originRowsCache, draftRowsCache } = useEditable({ onChange });

    const row = { id: 1, name: 'Alice' };
    startEditable(row);

    expect(isEditable(row)).toBe(true);
    expect(editableKeys.value).toContain(1);
    expect(originRowsCache.value[1]).toEqual(row);
    expect(draftRowsCache.value[1]).toEqual(row);
    expect(onChange).toHaveBeenCalledWith([1], [row]);
  });

  it('should cancel editable and restore original row', async () => {
    const onCancel = vi.fn().mockResolvedValue(true);
    const { startEditable, cancelEditable, isEditable, originRowsCache } = useEditable({ onCancel });

    const row = { id: 1, name: 'Alice' };
    startEditable(row);
    
    expect(isEditable(row)).toBe(true);
    
    // 取消编辑
    await cancelEditable(row);

    expect(onCancel).toHaveBeenCalledWith(1, row, { id: 1, name: 'Alice' });
    expect(isEditable(row)).toBe(false);
    expect(originRowsCache.value[1]).toBeUndefined();
  });

  it('should not cancel if onCancel returns false', async () => {
    const onCancel = vi.fn().mockResolvedValue(false);
    const { startEditable, cancelEditable, isEditable } = useEditable({ onCancel });

    const row = { id: 1, name: 'Alice' };
    startEditable(row);
    
    await cancelEditable(row);

    expect(onCancel).toHaveBeenCalled();
    // 取消被拦截，依然在编辑态
    expect(isEditable(row)).toBe(true);
  });

  it('should save editable correctly', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { startEditable, saveEditable, isEditable, originRowsCache } = useEditable({ onSave });

    const row = { id: 1, name: 'Alice' };
    startEditable(row);

    const updatedRow = { id: 1, name: 'Alice Updated' };
    await saveEditable(row, updatedRow);

    expect(onSave).toHaveBeenCalledWith(1, updatedRow, { id: 1, name: 'Alice' });
    expect(isEditable(row)).toBe(false);
    expect(originRowsCache.value[1]).toBeUndefined();
  });

  it('should not save if onSave returns false', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    const { startEditable, saveEditable, isEditable } = useEditable({ onSave });

    const row = { id: 1, name: 'Alice' };
    startEditable(row);

    const updatedRow = { id: 1, name: 'Alice Updated' };
    await saveEditable(row, updatedRow);

    // 保存被拦截，依然在编辑态
    expect(isEditable(row)).toBe(true);
  });

  it('should call onDelete correctly', async () => {
    const onDelete = vi.fn().mockResolvedValue(true);
    const { deleteRow } = useEditable({ onDelete });

    const row = { id: 1, name: 'Alice' };
    await deleteRow(row);

    expect(onDelete).toHaveBeenCalledWith(1, row);
  });
});
