import type { CursorChangeEvent } from '../../events';

/* A visual for the cursor, driven by the cursor on every change. vexml ships a vertical-bar default
 * (Score.createPlayhead); a caller can implement this to move a DOM element, draw on a layer, etc.
 * `render` gets the full change event but a position-only view just reads `e.position`. */
export interface CursorView {
	render(e: CursorChangeEvent): void;
	dispose(): void;
}
