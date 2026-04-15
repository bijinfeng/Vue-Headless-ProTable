import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AntdvProTable',
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['vue', 'ant-design-vue', '@headless-pro-table/core'],
      output: {
        globals: {
          vue: 'Vue',
          'ant-design-vue': 'Antd'
        }
      }
    }
  }
});

