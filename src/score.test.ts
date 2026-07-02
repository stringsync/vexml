import { describe, expect, it } from 'bun:test';
import { ColorStyle, DefaultDecoration } from './elements/decorations';
import type { Element } from './elements/element';
import { ElementIndex } from './elements/element-index';
import type { HitTester } from './elements/hit-tester';
import { Measure } from './elements/measure';
import type { Note } from './elements/note';
import { ScoreReader } from './engraving/score-reader';
import { Rect } from './geometry';
import type { Host, Layer, LayerKind, Viewport } from './host/stage';
import { SequenceFactory } from './playback/sequence-factory';
import { Score } from './score';
import { FakeScroller } from './testing/fake-scroller';

// An empty timeline — these tests exercise events/layers/hover, not playback.
const EMPTY_SEQUENCE = new SequenceFactory(new ScoreReader()).createFromInput({
	measures: [],
	notes: [],
});

// Separate fake classes fulfilling the injected seams (preferred over mocks).

// A no-op 2D context: the real DefaultDecoration draws on the layer it gets from the host, so the
// fake layer's context must absorb those calls. (What's painted is asserted in decorations.test.ts.)
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
	readonly scroller = new FakeScroller();
	relayoutLayers(): void {
		this.relayoutLayersCalls++;
	}
	dispose(): void {
		this.disposed = true;
	}
}

class FakeHitTester implements HitTester {
	readonly probes: Array<{ x: number; y: number }> = [];
	constructor(private readonly result: Element | null) {}
	hitTest(point: { x: number; y: number }): Element | null {
		this.probes.push(point);
		return this.result;
	}
	hitTestAll(point: { x: number; y: number }): Element[] {
		this.probes.push(point);
		return this.result ? [this.result] : [];
	}
	hitTestWithin(): Element[] {
		return this.result ? [this.result] : [];
	}
}

// Wrap a HitTester into the ElementIndex Score takes; these tests don't enumerate.
function elementIndex(hitTester: HitTester): ElementIndex {
	return new ElementIndex(hitTester, new Map(), new Map(), new Map(), []);
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

function fixture(target: Element | null) {
	const host = new FakeHost();
	const index = new FakeHitTester(target);
	const decoration = new DefaultDecoration(host, new ColorStyle());
	const score = new Score(
		host,
		elementIndex(index),
		[decoration],
		EMPTY_SEQUENCE,
		host.scroller,
	);
	return { host, index, decoration, score };
}

describe('Score', () => {
	it('a pointer event hit-tests the point and emits target, score-space point, and native', () => {
		const target = new Measure(new Rect(0, 0, 10, 10), viewport, '1', 0, []);
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

	it('scroll events carry the offset', () => {
		const { host, score } = fixture(null);
		host.scroll = { left: 12, top: 34 };
		const seen: Array<{ left: number; top: number }> = [];
		score.addEventListener('scroll', (e) =>
			seen.push({ left: e.left, top: e.top }),
		);
		host.events.dispatchEvent(new Event('scroll'));
		expect(seen).toEqual([{ left: 12, top: 34 }]);
	});

	it('hover fires only on target change and recomputes on scroll; unsubscribe detaches scroll', () => {
		const target = new Measure(new Rect(0, 0, 10, 10), viewport, '1', 0, []);
		const host = new FakeHost();
		// A mutable hit result lets the test flip what's "under the pointer" to simulate scrolling the
		// target out from under a stationary pointer (FakeHost.toScoreSpace is identity).
		let hit: Element | null = target;
		const index: HitTester = {
			hitTest: () => hit,
			hitTestAll: () => (hit ? [hit] : []),
			hitTestWithin: () => (hit ? [hit] : []),
		};
		const score = new Score(
			host,
			elementIndex(index),
			[new DefaultDecoration(host, new ColorStyle())],
			EMPTY_SEQUENCE,
			host.scroller,
		);

		const seen: Array<Element | null> = [];
		const listener = (e: { target: Element | null }) => seen.push(e.target);
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

	it('addLayer delegates to the host and forwards zIndex; rejects non-integers', () => {
		const { host, score } = fixture(null);
		const layer = score.addLayer('content');
		expect(host.created).toHaveLength(1);
		expect(host.created[0]).toBe(layer as FakeLayer);
		score.addLayer('content', -2);
		expect(host.created[1]?.zIndex).toBe(-2);
		expect(() => score.addLayer('content', 1.5)).toThrow();
		expect(() => score.addLayer('content', Number.NaN)).toThrow();
	});

	it('createPlayhead draws on its own content layer', () => {
		const { host, score } = fixture(null);
		score.createPlayhead();
		expect(host.created).toHaveLength(1);
		expect(host.created[0]?.kind).toBe('content');
	});

	it('getElements returns the index the score was built with', () => {
		const index = elementIndex(new FakeHitTester(null));
		const host = new FakeHost();
		const score = new Score(
			host,
			index,
			[new DefaultDecoration(host, new ColorStyle())],
			EMPTY_SEQUENCE,
			host.scroller,
		);
		expect(score.getElements()).toBe(index);
	});

	it('getTimeAt interpolates the time under a point and reports the closest step', () => {
		const host = new FakeHost();
		// A measure at index 0 with two quarter notes (x 10 @ beat 0, x 20 @ beat 1) at 120bpm.
		const sequence = new SequenceFactory(new ScoreReader()).createFromInput({
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
		const target = new Measure(new Rect(0, 0, 1000, 100), viewport, '1', 0, []);
		const score = new Score(
			host,
			elementIndex(new FakeHitTester(target)),
			[new DefaultDecoration(host, new ColorStyle())],
			sequence,
			host.scroller,
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
			elementIndex(new FakeHitTester(null)),
			[new DefaultDecoration(host, new ColorStyle())],
			sequence,
			host.scroller,
		);
		expect(offScore.getTimeAt({ x: 15, y: 50 })).toBeNull();
	});

	it('dispose detaches every listener and tears down the decorations and host', () => {
		const target = new Measure(new Rect(0, 0, 10, 10), viewport, '1', 0, []);
		const { host, index, decoration, score } = fixture(target);
		score.addEventListener('pointermove', () => {});
		score.addEventListener('resize', () => {});
		decoration.set(target, '#ff0000');

		score.dispose();

		expect(host.disposed).toBe(true);
		expect(host.resizeUnobserved).toBe(true);
		expect(decoration.has(target)).toBe(false); // decoration.dispose() ran
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 9, 9));
		expect(index.probes).toHaveLength(0); // pointer handler detached
	});
});
