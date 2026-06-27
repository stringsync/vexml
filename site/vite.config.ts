import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Run via `vex dev` (root is site/, so vite finds this config). Imports vexml straight
// from ../src like the tests do, so the playground always reflects the working tree.
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: { fs: { allow: ['..'] } },
});
