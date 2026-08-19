import { render } from '@stringsync/vexml';

declare global {
	interface Window {
		render: typeof render;
	}
}

// Exposed for the test harness to call via page.evaluate.
window.render = render;
