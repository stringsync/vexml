import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import App from './app';
import './index.css';

const root = document.getElementById('root');
if (!root) {
	throw new Error('root element not found');
}
createRoot(root).render(
	<TooltipProvider>
		<App />
	</TooltipProvider>,
);
