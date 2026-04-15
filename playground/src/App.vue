<template>
  <div class="app-container">
    <h1>Vue Headless ProTable Playground</h1>
    
    <div class="card-container">
      <el-card shadow="always">
        <template #header>
          <h2>Element Plus 适配层 (带有跨页选择与异步字典)</h2>
        </template>
        <ElementProTable
          :request="fetchUserList"
          :columns="userColumns"
          :rowSelection="{ onChange: handleElSelect }"
          preserveSelectedRowKeys
          rowKey="id"
          :debounceTime="300"
          :beforeSearchSubmit="handleBeforeSubmit"
        >
          <!-- 自定义 Element 单元格渲染 -->
          <template #cell-status="{ record }">
            <el-tag :type="record.status === 'active' ? 'success' : 'danger'">
              {{ record.status === 'active' ? '正常' : '停用' }}
            </el-tag>
          </template>
          <template #cell-createdAt="{ record }">
            {{ new Date(record.createdAt).toLocaleDateString() }}
          </template>
        </ElementProTable>
        <div style="margin-top: 10px;">
          <strong>Element 当前选中项 ID:</strong> {{ elSelectedKeys }}
        </div>
      </el-card>
    </div>

    <div class="card-container" style="margin-top: 40px;">
      <a-card title="Ant Design Vue 适配层 (同样的 Columns 配置)">
        <AntdvProTable
          :request="fetchUserList"
          :columns="userColumns"
          :rowSelection="{ onChange: handleAntdSelect }"
          preserveSelectedRowKeys
          rowKey="id"
          :debounceTime="300"
        >
          <!-- 自定义 Antd 单元格渲染 -->
          <template #cell-status="{ record }">
            <a-tag :color="record.status === 'active' ? 'green' : 'red'">
              {{ record.status === 'active' ? '正常' : '停用' }}
            </a-tag>
          </template>
          <template #cell-createdAt="{ record }">
            {{ new Date(record.createdAt).toLocaleDateString() }}
          </template>
        </AntdvProTable>
        <div style="margin-top: 10px;">
          <strong>Antd 当前选中项 ID:</strong> {{ antdSelectedKeys }}
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElementProTable } from '@headless-pro-table/element-plus';
import { AntdvProTable } from '@headless-pro-table/antdv';
import { fetchUserList, userColumns } from './mock';

const elSelectedKeys = ref<(string | number)[]>([]);
const antdSelectedKeys = ref<(string | number)[]>([]);

const handleElSelect = (keys: (string | number)[]) => {
  elSelectedKeys.value = keys;
};

const handleAntdSelect = (keys: (string | number)[]) => {
  antdSelectedKeys.value = keys;
};

// 测试 beforeSearchSubmit 拦截器
const handleBeforeSubmit = (params: any) => {
  console.log('[beforeSearchSubmit interceptor] Original params:', params);
  // 在发给后端前动态添加额外参数
  return {
    ...params,
    extraToken: 'abc-123'
  };
};
</script>

<style>
body {
  margin: 0;
  padding: 0;
  background-color: #f0f2f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
    'Noto Color Emoji';
}
.app-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}
h1 {
  text-align: center;
  margin-bottom: 40px;
}
.card-container {
  background: #fff;
  border-radius: 8px;
}
</style>
