import { describe, expect, it } from 'bun:test';
import { A, B, controller } from './cursor-controller-harness';
import { FakeCursorHost } from './cursor-host/fake-cursor-host';
import { FakeCursorView } from './cursor-view/fake-cursor-view';
import type { CursorChangeEvent } from './events';
import { Rect } from './geometry';
import { FakeScroller } from './scroller/fake-scroller';

describe('CursorController', () => {
	it('steps forward and back through the tickables, clamping at both ends', () => {
		const cursor = controller();
		expect(cursor.getIndex()).toBe(0);
		cursor.next();
		expect(cursor.getIndex()).toBe(1);
		expect(cursor.getTimeMs()).toBeCloseTo(500);
		cursor.previous();
		expect(cursor.getIndex()).toBe(0);
		cursor.previous(); // clamp
		expect(cursor.getIndex()).toBe(0);
		cursor.next();
		cursor.next();
		cursor.next();
		cursor.next(); // clamp at last (index 3)
		expect(cursor.getIndex()).toBe(3);
	});

	it('clamps a seek in ms to [0, durationMs] and resolves the step it lands on', () => {
		const cursor = controller();
		cursor.seekMs(1200);
		expect(cursor.getIndex()).toBe(2);
		expect(cursor.getTimeMs()).toBeCloseTo(1200);
		expect(cursor.getTimeBeats()).toBeCloseTo(2.4);
		cursor.seekMs(-100);
		expect(cursor.getTimeMs()).toBe(0);
		expect(cursor.getIndex()).toBe(0);
		cursor.seekMs(99999);
		expect(cursor.getTimeMs()).toBeCloseTo(2000);
		expect(cursor.getIndex()).toBe(3);
		expect(cursor.isDone()).toBe(true);
	});

	it('lands on the matching time when seeking in beats', () => {
		const cursor = controller();
		cursor.seekBeats(2);
		expect(cursor.getTimeMs()).toBeCloseTo(1000);
		expect(cursor.getIndex()).toBe(2);
	});

	it('reports the set sounding at the current step', () => {
		const cursor = controller();
		expect(cursor.getActiveElements()).toEqual([A]);
		cursor.next();
		expect(cursor.getActiveElements()).toEqual([B]);
	});

	it('a mid-step seek interpolates the bar position', () => {
		const cursor = controller();
		const events: CursorChangeEvent[] = [];
		cursor.events.on('change', (e) => events.push(e));
		cursor.seekMs(250); // halfway through step 0 (beat 0.5), bar glides x 10 -> 20
		const last = events.at(-1);
		expect(last?.index).toBe(0);
		expect(last?.position.rect.x).toBeCloseTo(15);
		// Same step: no attack/release, the held note sustains.
		expect(last?.started).toEqual([]);
		expect(last?.sustained).toEqual([A]);
		expect(last?.stopped).toEqual([]);
	});

	it('change reports note deltas: a retrigger is stop(prev) + start(next)', () => {
		const cursor = controller();
		const events: CursorChangeEvent[] = [];
		cursor.events.on('change', (e) => events.push(e));
		cursor.next(); // 0 -> 1
		expect(events).toHaveLength(1);
		const e = events[0];
		expect(e?.index).toBe(1);
		expect(e?.timeMs).toBeCloseTo(500);
		expect(e?.active).toEqual([B]);
		expect(e?.started).toEqual([B]);
		expect(e?.stopped).toEqual([A]);
		expect(e?.done).toBe(false);
	});

	it('stops delivering to a listener that has been removed', () => {
		const cursor = controller();
		const seen: number[] = [];
		const unlisten = cursor.events.on('change', (e: CursorChangeEvent) =>
			seen.push(e.index),
		);
		cursor.next();
		unlisten();
		cursor.next();
		expect(seen).toEqual([1]);
	});

	it('renders a synced view once immediately, then on each change, until it detaches', () => {
		const cursor = controller();
		const view = new FakeCursorView();
		const detach = cursor.sync(view);
		expect(view.events).toHaveLength(1); // immediate render
		cursor.next();
		expect(view.events).toHaveLength(2);
		detach.dispose();
		cursor.next();
		expect(view.events).toHaveLength(2); // detached
	});

	it('disposes the views still attached to it, but not the detached ones', () => {
		const cursor = controller();
		const attached = new FakeCursorView();
		const detached = new FakeCursorView();
		cursor.sync(attached);
		cursor.sync(detached).dispose();
		cursor.dispose();
		expect(attached.disposed).toBe(true);
		expect(detached.disposed).toBe(false);
	});

	it('scrolls while following only when the bar is not fully visible', () => {
		const host = new FakeCursorHost();
		const scroller = new FakeScroller();
		const cursor = controller({ host, scroller });
		host.vp = new Rect(0, 0, 1000, 1000); // covers the bar
		const unfollow = cursor.follow();
		cursor.next();
		expect(scroller.calls).toHaveLength(0);
		host.vp = new Rect(500, 0, 1000, 1000); // bar x ~20 now off-screen left
		cursor.next();
		expect(scroller.calls.length).toBeGreaterThan(0);
		unfollow.dispose();
		const before = scroller.calls.length;
		cursor.next();
		expect(scroller.calls).toHaveLength(before);
	});

	it('halts the score scroller on request', () => {
		const scroller = new FakeScroller();
		const cursor = controller({ scroller });
		cursor.cancelScroll();
		expect(scroller.cancels).toBe(1);
	});

	it('knows whether its bar sits entirely inside the viewport', () => {
		const host = new FakeCursorHost();
		const cursor = controller({ host });
		host.vp = new Rect(0, 0, 1000, 1000);
		expect(cursor.isFullyVisible()).toBe(true);
		host.vp = new Rect(500, 0, 1000, 1000);
		expect(cursor.isFullyVisible()).toBe(false);
	});

	it('visibility fires on transitions from both cursor moves and viewport changes', () => {
		const host = new FakeCursorHost(); // vp covers every bar (x 10..40, width 1)
		const cursor = controller({ host });
		const seen: boolean[] = [];
		cursor.events.on('visibility', (e) => seen.push(e.fullyVisible));

		// Narrow the viewport to x [0, 25]: bars at x 10 and 20 fit, 30 and 40 don't. The cursor sits at
		// x 10, so this isn't a transition.
		host.moveViewport(new Rect(0, 0, 25, 1000));
		expect(seen).toEqual([]);

		cursor.next(); // -> x 20, still inside; no event
		expect(seen).toEqual([]);
		cursor.next(); // -> x 30, scrolls off the right edge
		expect(seen).toEqual([false]);
		cursor.next(); // -> x 40, still off; no repeat
		expect(seen).toEqual([false]);

		host.moveViewport(new Rect(0, 0, 1000, 1000)); // widen: the bar is fully visible again
		expect(seen).toEqual([false, true]);
	});

	it('disposes the host it was given, releasing its page subscriptions', () => {
		const host = new FakeCursorHost();
		const cursor = controller({ host });
		expect(host.disposed).toBe(false);
		cursor.dispose();
		expect(host.disposed).toBe(true);
	});

	it('stops moving and emitting once disposed, announcing it exactly once', () => {
		let disposes = 0;
		const cursor = controller();
		const seen: number[] = [];
		cursor.events.on('dispose', () => disposes++);
		cursor.events.on('change', (e) => seen.push(e.index));
		cursor.dispose();
		cursor.dispose();
		cursor.next();
		expect(seen).toEqual([]);
		expect(disposes).toBe(1);
	});
});
