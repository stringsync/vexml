import { describe, expect, it } from 'bun:test';
import {
	Cursor,
	type CursorChangeEvent,
	type CursorHost,
	type CursorHostEventMap,
	type CursorView,
	type Scroller,
} from './cursor';
import { EventTarget } from './event-target';
import { Rect } from './geometry';
import { buildSequence, type SequenceNote } from './sequence';
import type { Note } from './targets';

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
	return buildSequence({
		measures: [
			{ index: 0, beats: 4, tempoBpm: 120, jumps: [], systemRect: SYS },
		],
		notes,
	});
}

class FakeScroller implements Scroller {
	calls: Rect[] = [];
	scrollIntoView(rect: Rect): void {
		this.calls.push(rect);
	}
}

class FakeHost implements CursorHost {
	readonly scroller = new FakeScroller();
	private readonly target = new EventTarget<CursorHostEventMap>();
	// The visible box, in the same identity coords clientRectOf maps to. Defaults to covering SYS.
	vp = new Rect(0, 0, 1000, 1000);
	clientRectOf(rect: Rect): DOMRect {
		return {
			x: rect.x,
			y: rect.y,
			width: rect.w,
			height: rect.h,
			left: rect.x,
			top: rect.y,
			right: rect.right,
			bottom: rect.bottom,
		} as DOMRect;
	}
	viewportRect(): DOMRect {
		return this.clientRectOf(this.vp);
	}
	addEventListener<K extends keyof CursorHostEventMap>(
		type: K,
		listener: (event: CursorHostEventMap[K]) => void,
	): void {
		this.target.addEventListener(type, listener);
	}
	removeEventListener<K extends keyof CursorHostEventMap>(
		type: K,
		listener: (event: CursorHostEventMap[K]) => void,
	): void {
		this.target.removeEventListener(type, listener);
	}
	// Test helper: move the viewport and notify, as a real scroll/resize would.
	moveViewport(rect: Rect): void {
		this.vp = rect;
		this.target.dispatchEvent('viewportchange', undefined);
	}
}

class FakeView implements CursorView {
	events: CursorChangeEvent[] = [];
	disposed = false;
	render(e: CursorChangeEvent): void {
		this.events.push(e);
	}
	dispose(): void {
		this.disposed = true;
	}
}

describe('Cursor', () => {
	it('next/previous step through tickables and clamp at the ends', () => {
		const cursor = new Cursor(fourQuarters(), new FakeHost());
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
		const cursor = new Cursor(fourQuarters(), new FakeHost());
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
		const cursor = new Cursor(fourQuarters(), new FakeHost());
		cursor.seekBeats(2);
		expect(cursor.getTimeMs()).toBeCloseTo(1000);
		expect(cursor.getIndex()).toBe(2);
	});

	it('a mid-step seek interpolates the bar position', () => {
		const cursor = new Cursor(fourQuarters(), new FakeHost());
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
		const cursor = new Cursor(fourQuarters(), new FakeHost());
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
		const cursor = new Cursor(fourQuarters(), new FakeHost());
		const seen: number[] = [];
		const listener = (e: CursorChangeEvent) => seen.push(e.index);
		cursor.addEventListener('change', listener);
		cursor.next();
		cursor.removeEventListener('change', listener);
		cursor.next();
		expect(seen).toEqual([1]);
	});

	it('attach renders once immediately, then on each change; unsubscribe detaches', () => {
		const cursor = new Cursor(fourQuarters(), new FakeHost());
		const view = new FakeView();
		const detach = cursor.attach(view);
		expect(view.events).toHaveLength(1); // immediate render
		cursor.next();
		expect(view.events).toHaveLength(2);
		detach();
		cursor.next();
		expect(view.events).toHaveLength(2); // detached
	});

	it('dispose disposes still-attached views but not detached ones', () => {
		const cursor = new Cursor(fourQuarters(), new FakeHost());
		const attached = new FakeView();
		const detached = new FakeView();
		cursor.attach(attached);
		cursor.attach(detached)();
		cursor.dispose();
		expect(attached.disposed).toBe(true);
		expect(detached.disposed).toBe(false);
	});

	it('follow scrolls only when the bar is not fully visible', () => {
		const host = new FakeHost();
		const cursor = new Cursor(fourQuarters(), host);
		host.vp = new Rect(0, 0, 1000, 1000); // covers the bar
		const unfollow = cursor.follow();
		cursor.next();
		expect(host.scroller.calls).toHaveLength(0);
		host.vp = new Rect(500, 0, 1000, 1000); // bar x ~20 now off-screen left
		cursor.next();
		expect(host.scroller.calls.length).toBeGreaterThan(0);
		unfollow();
		const before = host.scroller.calls.length;
		cursor.next();
		expect(host.scroller.calls).toHaveLength(before);
	});

	it('isFullyVisible reflects the viewport box', () => {
		const host = new FakeHost();
		const cursor = new Cursor(fourQuarters(), host);
		host.vp = new Rect(0, 0, 1000, 1000);
		expect(cursor.isFullyVisible()).toBe(true);
		host.vp = new Rect(500, 0, 1000, 1000);
		expect(cursor.isFullyVisible()).toBe(false);
	});

	it('visibility fires on transitions from both cursor moves and viewport changes', () => {
		const host = new FakeHost(); // vp covers every bar (x 10..40, width 1)
		const cursor = new Cursor(fourQuarters(), host);
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

	it('dispose is idempotent and stops movement/emits; onDispose fires once', () => {
		let disposes = 0;
		const cursor = new Cursor(fourQuarters(), new FakeHost(), () => disposes++);
		const seen: number[] = [];
		cursor.addEventListener('change', (e) => seen.push(e.index));
		cursor.dispose();
		cursor.dispose();
		cursor.next();
		expect(seen).toEqual([]);
		expect(disposes).toBe(1);
	});
});
