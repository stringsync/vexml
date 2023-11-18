import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: __dirname,
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
      vexflow: path.resolve(__dirname, '..', 'node_modules', 'vxflw-early-access'),
    },
  },
});
