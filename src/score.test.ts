import { expect, test } from 'bun:test';
import { Decorations } from './decorations';
import { Rect } from './geometry';
import type { HitTester } from './hit';
import { Score } from './score';
import type { Host, Layer, LayerKind } from './stage';
import { Measure, type PointerTarget, type Viewport } from './targets';

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
	constructor(readonly kind: LayerKind) {}
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
	resizeViewportLayersCalls = 0;
	readonly created: FakeLayer[] = [];
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
	createLayer(kind: LayerKind): Layer {
		const layer = new FakeLayer(kind);
		this.created.push(layer);
		return layer;
	}
	resizeViewportLayers(): void {
		this.resizeViewportLayersCalls++;
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
	const decorations = new Decorations(host);
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

test('resize is observed from construction and re-fits viewport layers before emitting', () => {
	const { host, score } = fixture(null);
	// Observed eagerly (it also drives viewport-layer sizing), not lazily on first subscriber.
	expect(host.resizeListener).not.toBeNull();

	const seen: Array<{ width: number; height: number }> = [];
	let layersResizedAtEmit = -1;
	score.addEventListener('resize', (e) => {
		layersResizedAtEmit = host.resizeViewportLayersCalls;
		seen.push({ width: e.width, height: e.height });
	});
	host.resizeListener?.({ width: 100, height: 50 });

	expect(seen).toEqual([{ width: 100, height: 50 }]);
	// Layers were re-fit (and cleared) before the caller's handler ran, so its redraw lands clean.
	expect(layersResizedAtEmit).toBe(1);
});

test('addLayer delegates to the host; removeLayer disposes the layer', () => {
	const { host, score } = fixture(null);
	const layer = score.addLayer('content');
	expect(host.created).toHaveLength(1);
	expect(host.created[0]).toBe(layer as FakeLayer);
	score.removeLayer(layer);
	expect(host.created[0]?.disposed).toBe(true);
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
