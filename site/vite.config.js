import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  base: '/',
  define: {
    VITE_VEXML_VERSION: JSON.stringify(process.env.npm_package_version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
      vexflow: path.resolve(__dirname, '..', 'node_modules', 'vxflw-early-access'),
    },
  },
});
