import type { Element } from '../element';
import type { Rect } from '../geometry';

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
