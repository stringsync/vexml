import { describe, expect, it } from 'bun:test';
import type { Scroller } from './cursor';
import { Decorations } from './decorations';
import { Rect } from './geometry';
import type { HitTester, TargetIndex } from './hit';
import { Score } from './score';
import { buildSequence } from './sequence';
import type { Host, Layer, LayerKind } from './stage';
import {
	Measure,
	type Note,
	type PointerTarget,
	type Viewport,
} from './targets';

// An empty timeline — these tests exercise events/layers/hover, not playback.
const EMPTY_SEQUENCE = buildSequence({ measures: [], notes: [] });

// Separate fake classes fulfilling the injected seams (preferred over mocks).

// A no-op 2D context: the real Decorations draws on the layer it gets from the host, so the fake
// layer's context must absorb those calls. (What's painted is asserted in decorations.test.ts.)
function noopContext(): CanvasRenderingContext2D {
	return {
		canvas: { width: 0, height: 0 },
		fillStyle: '',
		save() {},
		restore() {},
		setTransform() {},
		clearRect() {},
		beginPath() {},
		ellipse() {},
		arc() {},
		fill() {},
	} as unknown as CanvasRenderingContext2D;
}

class FakeLayer implements Layer {
	disposed = false;
	readonly ctx = noopContext();
	constructor(
		readonly kind: LayerKind,
		readonly zIndex?: number,
	) {}
	dispose(): void {
		this.disposed = true;
	}
}

class FakeHost implements Host {
	readonly events = new EventTarget();
	scroll = { left: 0, top: 0 };
	resizeListener: ((size: { width: number; height: number }) => void) | null =
		null;
	resizeUnobserved = false;
	disposed = false;
	relayoutLayersCalls = 0;
	readonly created: FakeLayer[] = [];
	// Identity transform: client coords are score coords, so tests assert on the input directly.
	toScoreSpace(clientX: number, clientY: number): { x: number; y: number } {
		return { x: clientX, y: clientY };
	}
	scrollListener: (() => void) | null = null;
	observeResize(
		onResize: (size: { width: number; height: number }) => void,
	): () => void {
		this.resizeListener = onResize;
		return () => {
			this.resizeUnobserved = true;
			this.resizeListener = null;
		};
	}
	observeScroll(onScroll: () => void): () => void {
		this.scrollListener = onScroll;
		return () => {
			this.scrollListener = null;
		};
	}
	createLayer(kind: LayerKind, zIndex?: number): Layer {
		const layer = new FakeLayer(kind, zIndex);
		this.created.push(layer);
		return layer;
	}
	clientRectOf(rect: Rect): DOMRect {
		return { x: rect.x, y: rect.y, width: rect.w, height: rect.h } as DOMRect;
	}
	viewportRect(): DOMRect {
		return { x: 0, y: 0, width: 0, height: 0 } as DOMRect;
	}
	readonly scroller: Scroller = { scrollIntoView() {} };
	relayoutLayers(): void {
		this.relayoutLayersCalls++;
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
	hitTestAll(point: { x: number; y: number }): PointerTarget[] {
		this.probes.push(point);
		return this.result ? [this.result] : [];
	}
	hitTestWithin(): PointerTarget[] {
		return this.result ? [this.result] : [];
	}
}

// Wrap a HitTester into the TargetIndex Score takes; tests that don't enumerate pass empty maps.
function targetIndex(
	hitTester: HitTester,
	overrides: Partial<Omit<TargetIndex, 'hitTester'>> = {},
): TargetIndex {
	return { hitTester, notes: new Map(), measures: new Map(), ...overrides };
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
	const decorations = new Decorations(host);
	const score = new Score(
		host,
		targetIndex(index),
		decorations,
		EMPTY_SEQUENCE,
	);
	return { host, index, decorations, score };
}

describe('Score', () => {
	it('a pointer event hit-tests the point and emits target, score-space point, and native', () => {
		const target = new Measure(new Rect(0, 0, 10, 10), viewport, '1', 0);
		const { host, index, score } = fixture(target);
		const seen: Array<{ type: string; x: number; y: number; native: Event }> =
			[];
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

	it('listeners are bound lazily: no subscriber means no hit-testing', () => {
		const { host, index } = fixture(null);
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 1, 2));
		expect(index.probes).toHaveLength(0);
	});

	it('the source is detached when the last listener leaves', () => {
		const { host, index, score } = fixture(null);
		const listener = () => {};
		score.addEventListener('pointermove', listener);
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 1, 1));
		score.removeEventListener('pointermove', listener);
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 2, 2));
		// Only the dispatch made while subscribed reached the hit tester.
		expect(index.probes).toEqual([{ x: 1, y: 1 }]);
	});

	it('the source stays bound until every listener for the type is removed', () => {
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

	it('scroll events carry the offset and the score.scroll getter reflects the host', () => {
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

	it('hover fires only on target change and recomputes on scroll; unsubscribe detaches scroll', () => {
		const target = new Measure(new Rect(0, 0, 10, 10), viewport, '1', 0);
		const host = new FakeHost();
		// A mutable hit result lets the test flip what's "under the pointer" to simulate scrolling the
		// target out from under a stationary pointer (FakeHost.toScoreSpace is identity).
		let hit: PointerTarget | null = target;
		const index: HitTester = {
			hitTest: () => hit,
			hitTestAll: () => (hit ? [hit] : []),
			hitTestWithin: () => (hit ? [hit] : []),
		};
		const score = new Score(
			host,
			targetIndex(index),
			new Decorations(host),
			EMPTY_SEQUENCE,
		);

		const seen: Array<PointerTarget | null> = [];
		const listener = (e: { target: PointerTarget | null }) =>
			seen.push(e.target);
		score.addEventListener('hover', listener);

		host.events.dispatchEvent(new FakePointerEvent('pointermove', 5, 5)); // enter target
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 6, 6)); // same target, quiet
		expect(seen).toEqual([target]);

		hit = null; // scroll slid the target away
		host.scrollListener?.();
		expect(seen).toEqual([target, null]);

		score.removeEventListener('hover', listener);
		expect(host.scrollListener).toBeNull(); // window-scroll subscription released
	});

	it('resize is observed from construction and re-fits viewport layers before emitting', () => {
		const { host, score } = fixture(null);
		// Observed eagerly (it also drives viewport-layer sizing), not lazily on first subscriber.
		expect(host.resizeListener).not.toBeNull();

		const seen: Array<{ width: number; height: number }> = [];
		let layersResizedAtEmit = -1;
		score.addEventListener('resize', (e) => {
			layersResizedAtEmit = host.relayoutLayersCalls;
			seen.push({ width: e.width, height: e.height });
		});
		host.resizeListener?.({ width: 100, height: 50 });

		expect(seen).toEqual([{ width: 100, height: 50 }]);
		// Layers were re-fit (and cleared) before the caller's handler ran, so its redraw lands clean.
		expect(layersResizedAtEmit).toBe(1);
	});

	it('addLayer delegates to the host; removeLayer disposes the layer', () => {
		const { host, score } = fixture(null);
		const layer = score.addLayer('content');
		expect(host.created).toHaveLength(1);
		expect(host.created[0]).toBe(layer as FakeLayer);
		score.removeLayer(layer);
		expect(host.created[0]?.disposed).toBe(true);
	});

	it('addLayer forwards zIndex to the host and rejects non-integers', () => {
		const { host, score } = fixture(null);
		score.addLayer('content', -2);
		expect(host.created[0]?.zIndex).toBe(-2);
		expect(() => score.addLayer('content', 1.5)).toThrow();
		expect(() => score.addLayer('content', Number.NaN)).toThrow();
	});

	it('getTimeAt interpolates the time under a point and reports the closest step', () => {
		const host = new FakeHost();
		// A measure at index 0 with two quarter notes (x 10 @ beat 0, x 20 @ beat 1) at 120bpm.
		const sequence = buildSequence({
			measures: [
				{
					index: 0,
					beats: 2,
					tempoBpm: 120,
					jumps: [],
					systemRect: new Rect(0, 0, 1000, 100),
				},
			],
			notes: [
				{
					note: {} as Note,
					measureIndex: 0,
					measureBeat: 0,
					beats: 1,
					x: 10,
					tiedFrom: null,
				},
				{
					note: {} as Note,
					measureIndex: 0,
					measureBeat: 1,
					beats: 1,
					x: 20,
					tiedFrom: null,
				},
			],
		});
		const target = new Measure(new Rect(0, 0, 1000, 100), viewport, '1', 0);
		const score = new Score(
			host,
			targetIndex(new FakeHitTester(target)),
			new Decorations(host),
			sequence,
		);

		// x 15 is halfway through step 0's glide (10 -> 20), so beat 0.5 = 250ms; closest step is 0.
		expect(score.getTimeAt({ x: 15, y: 50 })).toEqual({
			ms: 250,
			beat: 0.5,
			stepMs: 0,
			stepBeat: 0,
			stepIndex: 0,
		});
		// Far right lands in step 1 (snapped to beat 1 / 500ms) and clamps to the measure end.
		expect(score.getTimeAt({ x: 9999, y: 50 })).toEqual({
			ms: 1000,
			beat: 2,
			stepMs: 500,
			stepBeat: 1,
			stepIndex: 1,
		});

		const offScore = new Score(
			host,
			targetIndex(new FakeHitTester(null)),
			new Decorations(host),
			sequence,
		);
		expect(offScore.getTimeAt({ x: 15, y: 50 })).toBeNull();
	});

	it('dispose detaches every listener and tears down decorations and host', () => {
		const target = new Measure(new Rect(0, 0, 10, 10), viewport, '1', 0);
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

	it('getNotes and getMeasures enumerate the index maps in insertion order', () => {
		const host = new FakeHost();
		const m0 = new Measure(new Rect(0, 0, 10, 10), viewport, '1', 0);
		const m1 = new Measure(new Rect(10, 0, 10, 10), viewport, '2', 1);
		const n0 = { type: 'note' } as unknown as Note;
		const n1 = { type: 'note' } as unknown as Note;
		const score = new Score(
			host,
			targetIndex(new FakeHitTester(null), {
				// keyed by MNote / index in production; identity is all enumeration needs.
				notes: new Map([
					[{} as never, n0],
					[{} as never, n1],
				]),
				measures: new Map([
					[0, m0],
					[1, m1],
				]),
			}),
			new Decorations(host),
			EMPTY_SEQUENCE,
		);

		expect(score.getNotes()).toEqual([n0, n1]);
		expect(score.getMeasures()).toEqual([m0, m1]);
	});
});
