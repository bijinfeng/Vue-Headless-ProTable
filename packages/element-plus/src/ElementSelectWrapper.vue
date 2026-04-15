<template>
  <el-select
    v-model="modelValue"
    :loading="loading"
    clearable
    placeholder="请选择"
    v-bind="$attrs"
  >
    <!-- 解析 options 数组 -->
    <template v-if="Array.isArray(options)">
      <el-option
        v-for="item in options"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      />
    </template>
    
    <!-- 解析 options 对象映射 (Record) -->
    <template v-else-if="options && typeof options === 'object'">
      <el-option
        v-for="(val, key) in options"
        :key="key"
        :label="typeof val === 'object' ? val.text : val"
        :value="key"
      />
    </template>
  </el-select>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElSelect, ElOption } from 'element-plus';

const props = defineProps<{
  value?: any;
  loading?: boolean;
  options?: any[] | Record<string, { text: string; status?: string }>;
}>();

const emit = defineEmits(['update:value', 'change']);

const modelValue = computed({
  get: () => props.value,
  set: (val) => {
    emit('update:value', val);
    emit('change', val);
  }
});
</script>
