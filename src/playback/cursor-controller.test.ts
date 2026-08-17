import { describe, expect, it } from 'bun:test';
import type { Note } from '../elements/note';
import { ScoreReader } from '../engraving/score-reader';
import type { CursorChangeEvent } from '../events';
import { Rect } from '../geometry';
import { FakeScroller } from '../host/scroller/fake-scroller';
import { CursorController } from './cursor-controller';
import { FakeCursorHost } from './cursor-host/fake-cursor-host';
import { FakeCursorView } from './cursor-view/fake-cursor-view';
import type { SequenceNote } from './sequence';
import { SequenceFactory } from './sequence-factory';

// Identity tokens — only used for identity in active sets / deltas.
function fakeNote(label: string): Note {
	return { label } as unknown as Note;
}
const SYS = new Rect(0, 0, 1000, 100);
const A = fakeNote('a');
const B = fakeNote('b');
const C = fakeNote('c');
const D = fakeNote('d');

// Four quarters in one 4/4 measure @120bpm: steps at 0/500/1000/1500 ms, durationMs 2000.
function fourQuarters() {
	const notes: SequenceNote[] = [A, B, C, D].map((note, i) => ({
		note,
		measureIndex: 0,
		measureBeat: i,
		beats: 1,
		x: 10 + i * 10,
		tiedFrom: null,
	}));
	return new SequenceFactory(new ScoreReader(), []).createFromInput({
		measures: [
			{ index: 0, beats: 4, tempoBpm: 120, jumps: [], systemRect: SYS },
		],
		notes,
	});
}

function controller(opts?: { host?: FakeCursorHost; scroller?: FakeScroller }) {
	return new CursorController(
		fourQuarters(),
		opts?.host ?? new FakeCursorHost(),
		opts?.scroller ?? new FakeScroller(),
	);
}

describe('CursorController', () => {
	it('next/previous step through tickables and clamp at the ends', () => {
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

	it('seekMs clamps to [0, durationMs] and resolves the step', () => {
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

	it('seekBeats lands on the matching time', () => {
		const cursor = controller();
		cursor.seekBeats(2);
		expect(cursor.getTimeMs()).toBeCloseTo(1000);
		expect(cursor.getIndex()).toBe(2);
	});

	it('getActiveElements reports the sounding set at the current step', () => {
		const cursor = controller();
		expect(cursor.getActiveElements()).toEqual([A]);
		cursor.next();
		expect(cursor.getActiveElements()).toEqual([B]);
	});

	it('a mid-step seek interpolates the bar position', () => {
		const cursor = controller();
		const events: CursorChangeEvent[] = [];
		cursor.addEventListener('change', (e) => events.push(e));
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
		cursor.addEventListener('change', (e) => events.push(e));
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

	it('removeEventListener stops delivery', () => {
		const cursor = controller();
		const seen: number[] = [];
		const listener = (e: CursorChangeEvent) => seen.push(e.index);
		cursor.addEventListener('change', listener);
		cursor.next();
		cursor.removeEventListener('change', listener);
		cursor.next();
		expect(seen).toEqual([1]);
	});

	it('sync renders once immediately, then on each change; unsubscribe detaches', () => {
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

	it('dispose disposes still-attached views but not detached ones', () => {
		const cursor = controller();
		const attached = new FakeCursorView();
		const detached = new FakeCursorView();
		cursor.sync(attached);
		cursor.sync(detached).dispose();
		cursor.dispose();
		expect(attached.disposed).toBe(true);
		expect(detached.disposed).toBe(false);
	});

	it('follow scrolls only when the bar is not fully visible', () => {
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

	it('cancelScroll halts the score scroller', () => {
		const scroller = new FakeScroller();
		const cursor = controller({ scroller });
		cursor.cancelScroll();
		expect(scroller.cancels).toBe(1);
	});

	it('isFullyVisible reflects the viewport box', () => {
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
		cursor.addEventListener('visibility', (e) => seen.push(e.fullyVisible));

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

	it('stops moving and emitting once disposed, announcing it exactly once', () => {
		let disposes = 0;
		const cursor = controller();
		const seen: number[] = [];
		cursor.addEventListener('dispose', () => disposes++);
		cursor.addEventListener('change', (e) => seen.push(e.index));
		cursor.dispose();
		cursor.dispose();
		cursor.next();
		expect(seen).toEqual([]);
		expect(disposes).toBe(1);
	});
});
