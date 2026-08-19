import type { Rect } from 'webappwiz/geometry';
import type { Element } from './element';
import type { HitTester } from './hit-tester';

/* Fake fulfilling the HitTester seam (preferred over mocks); answers every query with whatever
 * `result` currently holds and records the points it was probed at, so a test drives pointer
 * behavior without building a quadtree. `result` is writable so a test can slide the target out
 * from under a stationary pointer. Test-only — excluded from the published package via
 * package.json "files". */
export class FakeHitTester implements HitTester {
	readonly probes: Array<{ x: number; y: number }> = [];

	constructor(public result: Element | null = null) {}

	hitTest(point: { x: number; y: number }): Element | null {
		this.probes.push(point);
		return this.result;
	}

	hitTestAll(point: { x: number; y: number }): Element[] {
		this.probes.push(point);
		return this.result ? [this.result] : [];
	}

	hitTestWithin(_rect: Rect): Element[] {
		return this.result ? [this.result] : [];
	}
}
