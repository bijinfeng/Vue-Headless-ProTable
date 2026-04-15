import type { ProColumnType } from '@headless-pro-table/core';

export interface UserItem {
  id: number;
  name: string;
  age: number;
  role: string;
  status: string;
  createdAt: number;
}

// 模拟数据库数据
const MOCK_DB: UserItem[] = Array.from({ length: 105 }).map((_, i) => ({
  id: i + 1,
  name: `用户 ${i + 1}`,
  age: 20 + (i % 30),
  role: i % 3 === 0 ? 'admin' : 'user',
  status: i % 5 === 0 ? 'disabled' : 'active',
  createdAt: Date.now() - i * 1000 * 60 * 60 * 24,
}));

// 模拟异步接口
export const fetchUserList = async (params: any, sorter: any, filter: any) => {
  console.log('--- Trigger Fetch ---', { params, sorter, filter });
  return new Promise<{ data: UserItem[]; success: boolean; total: number }>((resolve) => {
    setTimeout(() => {
      let filteredData = [...MOCK_DB];

      // 简单搜索逻辑
      if (params.name) {
        filteredData = filteredData.filter(item => item.name.includes(params.name));
      }
      if (params.role) {
        filteredData = filteredData.filter(item => item.role === params.role);
      }
      if (params.status) {
        filteredData = filteredData.filter(item => item.status === params.status);
      }
      if (params.createdAt) {
        // 日期被 formatter 转成了 YYYY-MM-DD
        console.log('Parsed Date Formatter:', params.createdAt);
      }

      // 简单排序逻辑
      if (sorter && sorter.age) {
        filteredData.sort((a, b) => sorter.age === 'ascend' ? a.age - b.age : b.age - a.age);
      }

      // 简单过滤逻辑 (表头)
      if (filter && filter.status && filter.status.length > 0) {
        filteredData = filteredData.filter(item => filter.status.includes(item.status));
      }

      const total = filteredData.length;
      const { current = 1, pageSize = 10 } = params;
      const start = (current - 1) * pageSize;
      const data = filteredData.slice(start, start + pageSize);

      resolve({
        data,
        total,
        success: true,
      });
    }, 500); // 模拟 500ms 延迟
  });
};

// 异步字典接口模拟
export const fetchRoleDict = () => {
  return new Promise<Record<string, any>>((resolve) => {
    setTimeout(() => {
      resolve({
        admin: { text: '管理员' },
        user: { text: '普通用户' },
      });
    }, 1000);
  });
};

// 共享的列配置
export const userColumns: ProColumnType<UserItem>[] = [
  {
    title: 'ID',
    dataIndex: 'id',
    hideInSearch: true,
  },
  {
    title: '用户名',
    dataIndex: 'name',
    valueType: 'text',
  },
  {
    title: '年龄',
    dataIndex: 'age',
    hideInSearch: true,
    sorter: true, // 开启表头排序
  },
  {
    title: '角色',
    dataIndex: 'role',
    valueType: 'select',
    valueEnum: fetchRoleDict, // 异步字典
  },
  {
    title: '状态',
    dataIndex: 'status',
    valueType: 'select',
    initialValue: 'active', // 测试初始值
    valueEnum: {
      active: { text: '正常', status: 'Success' },
      disabled: { text: '停用', status: 'Error' },
    },
    // 表单联动测试：当 role 改变时，status 会自动清空并触发相关行为
    dependencies: ['role']
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    valueType: 'date',
    dateFormatter: 'YYYY/MM/DD', // 测试自动格式化
  },
];
