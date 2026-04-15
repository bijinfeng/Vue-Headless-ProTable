import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from 'unplugin-vue-jsx/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue(), vueJsx()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ElementProTable',
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['vue', 'element-plus', '@headless-pro-table/core'],
      output: {
        globals: {
          vue: 'Vue',
          'element-plus': 'ElementPlus'
        }
      }
    }
  }
});