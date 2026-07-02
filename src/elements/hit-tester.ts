import { Rect } from '../geometry';
import type { Element } from './element';
import type { QuadTree } from './quadtree';

/*
 * The hit index: a spatial map from a point in score space to the element under it. Built once
 * per render from the geometry the draw pass emits, then queried on every pointer event.
 */
export interface HitTester {
	hitTest(point: { x: number; y: number }): Element | null;
	/* Every element whose box covers the point, same priority order as hitTest (so [0] === hitTest). */
	hitTestAll(point: { x: number; y: number }): Element[];
	/* Every element whose box lies fully within the rect (marquee selection), same priority order. */
	hitTestWithin(rect: Rect): Element[];
}

// Topmost-first: a foreground glyph (note/fret) before the measure it sits on, and within a tier
// the tighter (smaller-area) box first — the ordering hitTest picks its single winner from.
function byPriority(a: Element, b: Element): number {
	const fa = a.type !== 'measure';
	const fb = b.type !== 'measure';
	if (fa !== fb) {
		return fa ? -1 : 1;
	}
	return a.rect.w * a.rect.h - b.rect.w * b.rect.h;
}

/* The production HitTester over the renderer's QuadTree (its collision broad-phase doubles as
 * the index — elements have boxes, so they're valid items). */
export class DefaultHitTester implements HitTester {
	constructor(private readonly tree: QuadTree<Element>) {}

	/*
	 * The element under `point`: a foreground glyph (note / fret) beats the measure background it
	 * sits on, and among same-tier overlaps the tighter (smaller-area) box wins — so a notehead
	 * is picked over the measure, and the nearer notehead of a chord over its neighbor.
	 */
	hitTest(point: { x: number; y: number }): Element | null {
		const probe = new Rect(point.x, point.y, 1, 1);
		let best: Element | null = null;
		let bestArea = Number.POSITIVE_INFINITY;
		let bestForeground = false;
		for (const target of this.tree.query(probe)) {
			const foreground = target.type !== 'measure';
			const area = target.rect.w * target.rect.h;
			const better =
				best === null ||
				(foreground && !bestForeground) ||
				(foreground === bestForeground && area < bestArea);
			if (better) {
				best = target;
				bestArea = area;
				bestForeground = foreground;
			}
		}
		return best;
	}

	hitTestAll(point: { x: number; y: number }): Element[] {
		const probe = new Rect(point.x, point.y, 1, 1);
		return this.tree.query(probe).sort(byPriority);
	}

	hitTestWithin(rect: Rect): Element[] {
		// query is a broad phase (intersects); keep only elements fully inside the rect.
		return this.tree
			.query(rect)
			.filter((t) => rect.contains(t.rect))
			.sort(byPriority);
	}
}
