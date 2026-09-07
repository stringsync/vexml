import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Run via `vex dev` (root is this package, so vite finds this config). Imports vexml
// straight from the workspace like the tests do, so the playground always reflects the
// working tree, hence serving from the repo root, two levels up, rather than this package.
export default defineConfig({
	plugins: [react(), tailwindcss()],
	// Mirrors the "@/*" paths entry in the root tsconfig, which is what the aliases in
	// components.json resolve through.
	resolve: {
		alias: { '@': dirname(fileURLToPath(import.meta.url)) },
	},
	server: { fs: { allow: ['../..'] } },
});
