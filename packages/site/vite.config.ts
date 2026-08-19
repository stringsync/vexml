import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Run via `vex dev` (root is this package, so vite finds this config). Imports vexml
// straight from the workspace like the tests do, so the playground always reflects the
// working tree — hence serving from the repo root, two levels up, rather than this package.
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: { fs: { allow: ['../..'] } },
});
