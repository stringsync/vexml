import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PerfApp } from './app';
import '../index.css';

// `vex perf --ui`'s page. It shares the playground's theme and components, but not its
// build: `vite build` only builds index.html, so vexml.dev never ships this.
const root = document.getElementById('root');
if (!root) {
	throw new Error('root element not found');
}
createRoot(root).render(
	<TooltipProvider>
		<PerfApp />
	</TooltipProvider>,
);
