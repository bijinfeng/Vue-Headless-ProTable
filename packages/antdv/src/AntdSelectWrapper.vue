<template>
  <a-select
    v-model:value="modelValue"
    :options="normalizedOptions"
    :loading="loading"
    :allowClear="true"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

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

const normalizedOptions = computed(() => {
  if (!props.options) return [];
  if (Array.isArray(props.options)) return props.options;
  return Object.entries(props.options).map(([value, meta]) => ({
    value,
    label: typeof meta === 'object' ? meta.text : String(meta)
  }));
});
</script>

