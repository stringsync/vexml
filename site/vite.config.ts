import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Run via `vex dev` (root is site/, so vite finds this config). Imports vexml straight
// from ../src like the tests do, so the playground always reflects the working tree.
export default defineConfig(({ command }) => ({
	// Pages serves at stringsync.github.io/vexml/, so built assets need the /vexml/ prefix.
	// Dev stays at / so `vex dev` keeps working at localhost:5174.
	base: command === 'build' ? '/vexml/' : '/',
	plugins: [react(), tailwindcss()],
	server: { fs: { allow: ['..'] } },
}));
