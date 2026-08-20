import { render } from '@stringsync/vexml';

// The <script> of index.html: the page renderer.ts drives. Its whole job is putting the
// library's entry point on `window` so serialized test fns (and `vex render`) can call it.
declare global {
	interface Window {
		render: typeof render;
	}
}

window.render = render;
