import { beforeEach, describe, expect, it } from 'bun:test';
import { Rect } from 'webappwiz/geometry';
import { CursorController } from './cursor-controller';
import { FakeCursorHost } from './cursor-host/fake-cursor-host';
import { FakeCursorView } from './cursor-view/fake-cursor-view';
import type { CursorChangeEvent } from './events';
import { Gaps } from './gaps';
import type { Note } from './note';
import { ScoreReader } from './score-reader';
import { FakeScroller } from './scroller/fake-scroller';
import type { SequenceNote } from './sequence';
import { SequenceFactory } from './sequence-factory';

// Identity tokens: the sequence only ever compares notes, so nothing else about them is read.
const note = (label: string) => ({ label }) as unknown as Note;
const A = note('a');
const B = note('b');

// Four quarters in one 4/4 measure @120bpm: steps at 0/500/1000/1500 ms, durationMs 2000, bars
// at x 10/20/30/40.
function fourQuarters() {
	const notes: SequenceNote[] = [A, B, note('c'), note('d')].map((n, i) => ({
		note: n,
		measureIndex: 0,
		measureBeat: i,
		beats: 1,
		x: 10 + i * 10,
		tiedFrom: null,
	}));
	return new SequenceFactory(new ScoreReader(), new Gaps([])).createFromInput({
		measures: [
			{
				index: 0,
				beats: 4,
				tempoBpm: 120,
				jumps: [],
				systemRect: new Rect(0, 0, 1000, 100),
			},
		],
		notes,
	});
}

describe('CursorController', () => {
	let host: FakeCursorHost;
	let scroller: FakeScroller;
	let cursor: CursorController;

	beforeEach(() => {
		host = new FakeCursorHost();
		scroller = new FakeScroller();
		cursor = new CursorController(fourQuarters(), host, scroller);
	});

	it('steps forward and back through the tickables, clamping at both ends', () => {
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
		cursor.seekBeats(2);
		expect(cursor.getTimeMs()).toBeCloseTo(1000);
		expect(cursor.getIndex()).toBe(2);
	});

	it('reports the set sounding at the current step', () => {
		expect(cursor.getActiveElements()).toEqual([A]);
		cursor.next();
		expect(cursor.getActiveElements()).toEqual([B]);
	});

	it('a mid-step seek interpolates the bar position', () => {
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
		const attached = new FakeCursorView();
		const detached = new FakeCursorView();
		cursor.sync(attached);
		cursor.sync(detached).dispose();
		cursor.dispose();
		expect(attached.disposed).toBe(true);
		expect(detached.disposed).toBe(false);
	});

	it('scrolls while following only when the bar is not fully visible', () => {
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
		cursor.cancelScroll();
		expect(scroller.cancels).toBe(1);
	});

	it('knows whether its bar sits entirely inside the viewport', () => {
		host.vp = new Rect(0, 0, 1000, 1000);
		expect(cursor.isFullyVisible()).toBe(true);
		host.vp = new Rect(500, 0, 1000, 1000);
		expect(cursor.isFullyVisible()).toBe(false);
	});

	it('visibility fires on transitions from both cursor moves and viewport changes', () => {
		// The host's viewport covers every bar (x 10..40, width 1).
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
		expect(host.disposed).toBe(false);
		cursor.dispose();
		expect(host.disposed).toBe(true);
	});

	it('stops moving and emitting once disposed, announcing it exactly once', () => {
		let disposes = 0;
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
