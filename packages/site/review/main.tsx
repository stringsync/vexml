import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReviewApp } from './app';
import { RuleInboxApp } from './rule-inbox';
import '../index.css';

// `vex review`'s page. It shares the playground's theme and components, but not its
// build: `vite build` only builds index.html, so vexml.dev never ships this.
const root = document.getElementById('root');
if (!root) {
	throw new Error('root element not found');
}

const isRulesMode =
	document
		.querySelector('meta[name="vex-review-mode"]')
		?.getAttribute('content') === 'rules' ||
	new URLSearchParams(window.location.search).get('mode') === 'rules';

createRoot(root).render(
	<TooltipProvider>
		{isRulesMode ? <RuleInboxApp /> : <ReviewApp />}
	</TooltipProvider>,
);
