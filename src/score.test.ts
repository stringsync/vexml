import { expect, test } from 'bun:test';
import { Decorations } from './decorations';
import { Rect } from './geometry';
import type { HitTester } from './hit';
import { Score } from './score';
import type { Host } from './stage';
import { Measure, type PointerTarget, type Viewport } from './targets';

// Separate fake classes fulfilling the injected seams (preferred over mocks).

class FakeHost implements Host {
	readonly events = new EventTarget();
	scroll = { left: 0, top: 0 };
	resizeListener: ((size: { width: number; height: number }) => void) | null =
		null;
	resizeUnobserved = false;
	disposed = false;
	// Identity transform: client coords are score coords, so tests assert on the input directly.
	toScoreSpace(clientX: number, clientY: number): { x: number; y: number } {
		return { x: clientX, y: clientY };
	}
	observeResize(
		onResize: (size: { width: number; height: number }) => void,
	): () => void {
		this.resizeListener = onResize;
		return () => {
			this.resizeUnobserved = true;
			this.resizeListener = null;
		};
	}
	dispose(): void {
		this.disposed = true;
	}
}

class FakeHitTester implements HitTester {
	readonly probes: Array<{ x: number; y: number }> = [];
	constructor(private readonly result: PointerTarget | null) {}
	hitTest(point: { x: number; y: number }): PointerTarget | null {
		this.probes.push(point);
		return this.result;
	}
}

// A bare EventTarget has no DOM tree, so a synthetic Event with the coords the handler reads is
// enough to drive a pointer event through.
class FakePointerEvent extends Event {
	constructor(
		type: string,
		readonly clientX: number,
		readonly clientY: number,
	) {
		super(type);
	}
}

const viewport: Viewport = {
	clientRectOf: (r) => ({ x: r.x, y: r.y, width: r.w, height: r.h }) as DOMRect,
	toScoreSpace: (x, y) => ({ x, y }),
};

function fixture(target: PointerTarget | null) {
	const host = new FakeHost();
	const index = new FakeHitTester(target);
	const decorations = new Decorations();
	const score = new Score(host, index, decorations);
	return { host, index, decorations, score };
}

test('a pointer event hit-tests the point and emits target, score-space point, and native', () => {
	const target = new Measure(new Rect(0, 0, 10, 10), viewport);
	const { host, index, score } = fixture(target);
	const seen: Array<{ type: string; x: number; y: number; native: Event }> = [];
	score.addEventListener('pointermove', (e) =>
		seen.push({
			type: e.target?.type ?? 'none',
			x: e.point.x,
			y: e.point.y,
			native: e.native,
		}),
	);

	const native = new FakePointerEvent('pointermove', 30, 40);
	host.events.dispatchEvent(native);

	expect(index.probes).toEqual([{ x: 30, y: 40 }]);
	expect(seen).toHaveLength(1);
	expect(seen[0]).toMatchObject({ type: 'measure', x: 30, y: 40, native });
});

test('listeners are bound lazily: no subscriber means no hit-testing', () => {
	const { host, index } = fixture(null);
	host.events.dispatchEvent(new FakePointerEvent('pointermove', 1, 2));
	expect(index.probes).toHaveLength(0);
});

test('the source is detached when the last listener leaves', () => {
	const { host, index, score } = fixture(null);
	const listener = () => {};
	score.addEventListener('pointermove', listener);
	host.events.dispatchEvent(new FakePointerEvent('pointermove', 1, 1));
	score.removeEventListener('pointermove', listener);
	host.events.dispatchEvent(new FakePointerEvent('pointermove', 2, 2));
	// Only the dispatch made while subscribed reached the hit tester.
	expect(index.probes).toEqual([{ x: 1, y: 1 }]);
});

test('the source stays bound until every listener for the type is removed', () => {
	const { host, index, score } = fixture(null);
	const a = () => {};
	const b = () => {};
	score.addEventListener('pointermove', a);
	score.addEventListener('pointermove', b);
	score.removeEventListener('pointermove', a);
	host.events.dispatchEvent(new FakePointerEvent('pointermove', 5, 5));
	expect(index.probes).toEqual([{ x: 5, y: 5 }]); // still bound for b
	score.removeEventListener('pointermove', b);
	host.events.dispatchEvent(new FakePointerEvent('pointermove', 6, 6));
	expect(index.probes).toEqual([{ x: 5, y: 5 }]); // now detached
});

test('scroll events carry the offset and the score.scroll getter reflects the host', () => {
	const { host, score } = fixture(null);
	host.scroll = { left: 12, top: 34 };
	const seen: Array<{ left: number; top: number }> = [];
	score.addEventListener('scroll', (e) =>
		seen.push({ left: e.left, top: e.top }),
	);
	host.events.dispatchEvent(new Event('scroll'));
	expect(seen).toEqual([{ left: 12, top: 34 }]);
	expect(score.scroll).toEqual({ left: 12, top: 34 });
});

test('resize subscribes through observeResize and unsubscribes on the last removal', () => {
	const { host, score } = fixture(null);
	const seen: Array<{ width: number; height: number }> = [];
	const a = (_e: { width: number; height: number }) => {};
	const b = (e: { width: number; height: number }) => seen.push(e);
	score.addEventListener('resize', a);
	score.addEventListener('resize', b);
	expect(host.resizeListener).not.toBeNull();
	host.resizeListener?.({ width: 100, height: 50 });
	expect(seen).toEqual([{ width: 100, height: 50 }]);

	score.removeEventListener('resize', a);
	expect(host.resizeUnobserved).toBe(false); // b still subscribed
	score.removeEventListener('resize', b);
	expect(host.resizeUnobserved).toBe(true); // last one gone -> ResizeObserver disconnected
});

test('dispose detaches every listener and tears down decorations and host', () => {
	const target = new Measure(new Rect(0, 0, 10, 10), viewport);
	const { host, index, decorations, score } = fixture(target);
	score.addEventListener('pointermove', () => {});
	score.addEventListener('resize', () => {});
	decorations.setColor(target, '#ff0000');

	score.dispose();

	expect(host.disposed).toBe(true);
	expect(host.resizeUnobserved).toBe(true);
	expect(decorations.isColored(target)).toBe(false); // decorations.dispose() ran
	host.events.dispatchEvent(new FakePointerEvent('pointermove', 9, 9));
	expect(index.probes).toHaveLength(0); // pointer handler detached
});
