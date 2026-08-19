import { describe, expect, it } from 'bun:test';
import { DefaultDecorations } from './decoration/default-decorations';
import type { Element } from './element';
import { Gaps } from './gaps';
import { Rect } from './geometry';
import { FakeHitTester } from './hit-tester/fake-hit-tester';
import type { HitTester } from './hit-tester/hit-tester';
import { FakeHost } from './host/fake-host';
import type { FakeLayer } from './layer/fake-layer';
import type { Note } from './note';
import { Score } from './score';
import {
	EMPTY_SEQUENCE,
	elementIndex,
	FakePointerEvent,
	fixture,
	measureBox,
} from './score-harness';
import { ScoreReader } from './score-reader';
import { SequenceFactory } from './sequence-factory';

describe('Score', () => {
	it('a pointer event hit-tests the point and emits target, score-space point, and native', () => {
		const target = measureBox(new Rect(0, 0, 10, 10));
		const { host, index, score } = fixture(target);
		const seen: Array<{ type: string; x: number; y: number; native: Event }> =
			[];
		score.events.on('pointermove', (e) =>
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
		const unlisten = score.events.on('pointermove', () => {});
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 1, 1));
		unlisten();
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 2, 2));
		// Only the dispatch made while subscribed reached the hit tester.
		expect(index.probes).toEqual([{ x: 1, y: 1 }]);
	});

	it('a once listener releases the source when it fires', () => {
		const { host, index, score } = fixture(null);
		score.events.on('pointermove', () => {}, { once: true });
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 1, 1));
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 2, 2));
		// The listener unsubscribed itself, so the second dispatch never reached the hit tester.
		expect(index.probes).toEqual([{ x: 1, y: 1 }]);
	});

	it('the source stays bound until every listener for the type is removed', () => {
		const { host, index, score } = fixture(null);
		const a = score.events.on('pointermove', () => {});
		const b = score.events.on('pointermove', () => {});
		a();
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 5, 5));
		expect(index.probes).toEqual([{ x: 5, y: 5 }]); // still bound for b
		b();
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 6, 6));
		expect(index.probes).toEqual([{ x: 5, y: 5 }]); // now detached
	});

	it('scroll events carry the offset', () => {
		const { host, score } = fixture(null);
		host.scroll = { left: 12, top: 34 };
		const seen: Array<{ left: number; top: number }> = [];
		score.events.on('scroll', (e) => seen.push({ left: e.left, top: e.top }));
		host.events.dispatchEvent(new Event('scroll'));
		expect(seen).toEqual([{ left: 12, top: 34 }]);
	});

	it('hover fires only on target change and recomputes on scroll; unsubscribe detaches scroll', () => {
		const target = measureBox(new Rect(0, 0, 10, 10));
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
			new DefaultDecorations(host),
			EMPTY_SEQUENCE,
			host.scroller,
		);

		const seen: Array<Element | null> = [];
		const unlisten = score.events.on('hover', (e) => seen.push(e.target));

		host.events.dispatchEvent(new FakePointerEvent('pointermove', 5, 5)); // enter target
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 6, 6)); // same target, quiet
		expect(seen).toEqual([target]);

		hit = null; // scroll slid the target away
		host.scrollListener?.();
		expect(seen).toEqual([target, null]);

		unlisten();
		expect(host.scrollListener).toBeNull(); // window-scroll subscription released
	});

	it('resize is observed from construction and re-fits viewport layers before emitting', () => {
		const { host, score } = fixture(null);
		// Observed eagerly (it also drives viewport-layer sizing), not lazily on first subscriber.
		expect(host.resizeListener).not.toBeNull();

		const seen: Array<{ width: number; height: number }> = [];
		let layersResizedAtEmit = -1;
		score.events.on('resize', (e) => {
			layersResizedAtEmit = host.relayoutLayersCalls;
			seen.push({ width: e.width, height: e.height });
		});
		host.resizeListener?.({ width: 100, height: 50 });

		expect(seen).toEqual([{ width: 100, height: 50 }]);
		// Layers were re-fit (and cleared) before the caller's handler ran, so its redraw lands clean.
		expect(layersResizedAtEmit).toBe(1);
	});

	it('a base-only change (same container size) relayouts without re-emitting resize', () => {
		const { host, score } = fixture(null);
		const seen: Array<{ width: number; height: number }> = [];
		score.events.on('resize', (e) =>
			seen.push({ width: e.width, height: e.height }),
		);

		// First notification: real container size → relayout + emit.
		host.resizeListener?.({ width: 100, height: 50 });
		// Base-canvas reflow with the container size held constant (e.g. the music font settling
		// taller): observeResize still fires, reporting the unchanged container size.
		host.resizeListener?.({ width: 100, height: 50 });

		// Layers were re-synced to the base's live box on both notifications (the drift fix)...
		expect(host.relayoutLayersCalls).toBe(2);
		// ...but the caller only saw one 'resize', since the container size never changed.
		expect(seen).toEqual([{ width: 100, height: 50 }]);
	});

	it('gets a layer from the host at the requested z-index, and rejects a non-integer one', () => {
		const { host, score } = fixture(null);
		const layer = score.addLayer('content');
		expect(host.created).toHaveLength(1);
		expect(host.created[0]).toBe(layer as FakeLayer);
		score.addLayer('content', -2);
		expect(host.created[1]?.zIndex).toBe(-2);
		expect(() => score.addLayer('content', 1.5)).toThrow();
		expect(() => score.addLayer('content', Number.NaN)).toThrow();
	});

	it('gives a new playhead a content layer of its own to draw on', () => {
		const { host, score } = fixture(null);
		score.createPlayhead();
		expect(host.created).toHaveLength(1);
		expect(host.created[0]?.kind).toBe('content');
	});

	it('hands back the element index it was built with', () => {
		const index = elementIndex(new FakeHitTester(null));
		const host = new FakeHost();
		const score = new Score(
			host,
			index,
			new DefaultDecorations(host),
			EMPTY_SEQUENCE,
			host.scroller,
		);
		expect(score.getElements()).toBe(index);
	});

	it('interpolates the playback time under a point, and reports the step nearest it', () => {
		const host = new FakeHost();
		// A measure at index 0 with two quarter notes (x 10 @ beat 0, x 20 @ beat 1) at 120bpm.
		const sequence = new SequenceFactory(
			new ScoreReader(),
			new Gaps([]),
		).createFromInput({
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
		const target = measureBox(new Rect(0, 0, 1000, 100));
		const score = new Score(
			host,
			elementIndex(new FakeHitTester(target)),
			new DefaultDecorations(host),
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
			new DefaultDecorations(host),
			sequence,
			host.scroller,
		);
		expect(offScore.getTimeAt({ x: 15, y: 50 })).toBeNull();
	});

	it('detaches every listener and tears down its decorations and host when disposed', () => {
		const target = measureBox(new Rect(0, 0, 10, 10));
		const { host, index, decorations, score } = fixture(target);
		score.events.on('pointermove', () => {});
		score.events.on('resize', () => {});
		decorations.color.set(target, '#ff0000');

		score.dispose();

		expect(host.disposed).toBe(true);
		expect(host.resizeUnobserved).toBe(true);
		expect(decorations.color.has(target)).toBe(false); // decorations.dispose() ran
		host.events.dispatchEvent(new FakePointerEvent('pointermove', 9, 9));
		expect(index.probes).toHaveLength(0); // pointer handler detached
	});
});
