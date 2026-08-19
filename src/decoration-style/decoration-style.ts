import type { Rect } from 'webappwiz/geometry';
import type { Decoratable } from '../decoration/decoration';
import type { LayerKind } from '../layer/layer';

/*
 * The varying half of a decoration kind: which overlay it paints on and how one target is
 * stamped. The store/repaint machinery lives in DefaultDecoration, written once — a new kind of
 * decoration is a new style, not a new store.
 */
export interface DecorationStyle {
	readonly placement: LayerKind;
	draw(ctx: CanvasRenderingContext2D, target: Decoratable, color: string): void;
	/* The score-space region draw() can touch for this target, padding included — the region a
	 * repaint clears and clips to when this target changes. */
	bounds(target: Decoratable): Rect;
}
