import { beforeEach, describe, expect, it } from 'bun:test';
import { Rect } from 'webappwiz/geometry';
import { FakeScrollHost } from './fake-scroll-host';
import { ScrollController } from './scroll-controller';

// Longer than SCROLL_DURATION_MS (200) so an in-flight tween has fully landed.
const settle = () => new Promise((r) => setTimeout(r, 500));

// Unless a test says otherwise, the target is a narrow rect at x=0, always visible horizontally
// (left stays 0), so the offsets are all vertical: top lands at the rect's y minus the 16px of
// headroom the controller leaves above it.
describe('ScrollController', () => {
	let host: FakeScrollHost;
	let scroller: ScrollController;

	beforeEach(() => {
		host = new FakeScrollHost();
		scroller = new ScrollController(host);
	});

	it('passes the axis-resolved offset straight through on an instant scroll', () => {
		scroller.scrollIntoView(new Rect(150, 10, 10, 10));
		expect(host.calls).toEqual([{ left: 134, top: 0, behavior: undefined }]);
	});

	it('does not scroll when the target is already visible', () => {
		scroller.scrollIntoView(new Rect(50, 50, 10, 10));
		expect(host.calls).toHaveLength(0);
	});

	it('turns the page to the left edge when the target runs off to the right', () => {
		// The 150..160 target left the 0..100 view by its right edge, so it comes back 16px in
		// from the left with the rest of the viewport ahead of it — not pinned flush at the right.
		scroller.scrollIntoView(new Rect(150, 10, 10, 10));
		expect(host.last()?.left).toBe(134);
	});

	it('turns the page to the right edge when the target runs off to the left', () => {
		// Mirrored: the 220..230 target left the 300..400 view by its left edge, so it comes back
		// 16px in from the right with the viewport it came from behind it.
		host.scroll = { left: 300, top: 0 };
		scroller.scrollIntoView(new Rect(220, 10, 10, 10));
		expect(host.last()?.left).toBe(146);
	});

	it('aligns a target wider than the viewport to its left edge', () => {
		// Off both sides at once, so there is no edge it left by; the near edge wins. scrollTo
		// clamps the negative to 0 in a real container.
		host.scroll = { left: 50, top: 0 };
		scroller.scrollIntoView(new Rect(20, 10, 300, 10));
		expect(host.last()?.left).toBe(4);
	});

	it('does not scroll x while the target stays inside the view', () => {
		// The creep this guards against: three bars advancing across one viewport must leave the
		// horizontal offset alone, or the music would slide under the cursor note by note.
		host.scroll = { left: 300, top: 0 };
		for (const x of [310, 350, 390]) {
			scroller.scrollIntoView(new Rect(x, 10, 10, 10));
		}
		expect(host.calls).toHaveLength(0);
	});

	it('turns downward pages with the target near the top', () => {
		scroller.scrollIntoView(new Rect(50, 150, 10, 10));
		expect(host.last()).toEqual({ left: 0, top: 134, behavior: undefined });
	});

	it('turns upward pages with the target near the bottom', () => {
		host.scroll = { left: 0, top: 300 };
		scroller.scrollIntoView(new Rect(50, 220, 10, 10));
		expect(host.last()).toEqual({ left: 0, top: 146, behavior: undefined });
	});

	it('leaves both axes still through focus changes, including viewport edges', async () => {
		host.scroll = { left: 300, top: 300 };
		for (const position of [300, 350, 390]) {
			scroller.scrollIntoView(new Rect(position, position, 10, 10), {
				behavior: 'smooth',
			});
		}
		await settle();
		expect(host.calls).toHaveLength(0);
	});

	it('pages both axes when the target leaves both', () => {
		host.scroll = { left: 300, top: 0 };
		scroller.scrollIntoView(new Rect(220, 150, 10, 10));
		expect(host.last()).toEqual({ left: 146, top: 134, behavior: undefined });
	});

	it('reduces padding so a nearly viewport-sized target fits completely', () => {
		scroller.scrollIntoView(new Rect(150, 150, 90, 90));
		expect(host.last()).toEqual({ left: 140, top: 140, behavior: undefined });
		host.scroll = { left: 300, top: 300 };
		scroller.scrollIntoView(new Rect(150, 150, 90, 90));
		expect(host.last()).toEqual({ left: 150, top: 150, behavior: undefined });
	});

	it('keeps the current page destination when it already reveals the next target', async () => {
		scroller.scrollIntoView(new Rect(0, 150, 10, 10), { behavior: 'smooth' });
		scroller.scrollIntoView(new Rect(0, 170, 10, 10), { behavior: 'smooth' });
		await settle();
		expect(host.last()?.top).toBe(134);
	});

	it('stops an old page turn that would hide newly focused visible content', async () => {
		scroller.scrollIntoView(new Rect(0, 150, 10, 10), { behavior: 'smooth' });
		scroller.scrollIntoView(new Rect(0, 20, 10, 10), { behavior: 'smooth' });
		const count = host.calls.length;
		await settle();
		expect(host.calls).toHaveLength(count);
	});

	it('tweens over several instant frames and lands exactly on the target', async () => {
		scroller.scrollIntoView(new Rect(0, 100, 10, 10), { behavior: 'smooth' });
		await settle();
		expect(host.calls.length).toBeGreaterThan(2); // it animated rather than snapping
		expect(host.calls.every((c) => c.behavior === 'instant')).toBe(true);
		expect(host.last()).toEqual({ left: 0, top: 84, behavior: 'instant' });
	});

	it('retargets the same tween to the latest destination when requests stream in', async () => {
		scroller.scrollIntoView(new Rect(0, 100, 10, 10), { behavior: 'smooth' });
		scroller.scrollIntoView(new Rect(0, 200, 10, 10), { behavior: 'smooth' });
		scroller.scrollIntoView(new Rect(0, 300, 10, 10), { behavior: 'smooth' });
		await settle();
		expect(host.last()).toEqual({ left: 0, top: 284, behavior: 'instant' }); // the latest won
	});

	it('snaps instantly when the travel would exceed the max scroll speed', async () => {
		// ~5000px over the 350ms tween far exceeds the speed cap.
		scroller.scrollIntoView(new Rect(0, 5000, 10, 10), { behavior: 'smooth' });
		expect(host.calls).toEqual([{ left: 0, top: 4984, behavior: 'instant' }]);
		await settle();
		expect(host.calls).toHaveLength(1); // one snap, no tween frames
	});

	it('halts the tween at the current offset and issues no further frames when cancelled', async () => {
		scroller.scrollIntoView(new Rect(0, 100, 10, 10), { behavior: 'smooth' });
		host.scroll = { left: 0, top: 40 }; // wherever the tween happens to be mid-flight
		scroller.cancel();
		expect(host.last()).toEqual({ left: 0, top: 40, behavior: 'instant' });
		const count = host.calls.length;
		await settle();
		expect(host.calls).toHaveLength(count); // no more frames after cancel
	});

	it('cancels the in-flight tween, drops scrolls, then resumes once a resize settles', async () => {
		scroller.scrollIntoView(new Rect(0, 100, 10, 10), { behavior: 'smooth' });
		scroller.suspendForResize(); // cancels it to the current offset, blocks new scrolls
		scroller.scrollIntoView(new Rect(0, 200, 10, 10), { behavior: 'smooth' }); // dropped
		const count = host.calls.length;
		await settle();
		expect(host.calls).toHaveLength(count); // nothing scrolled while suspended
		scroller.scrollIntoView(new Rect(0, 300, 10, 10), { behavior: 'smooth' });
		await settle();
		expect(host.last()).toEqual({ left: 0, top: 284, behavior: 'instant' });
	});

	it('cancels only once when a resize burst suspends repeatedly', () => {
		scroller.suspendForResize();
		scroller.suspendForResize();
		scroller.suspendForResize();
		expect(host.calls).toEqual([{ left: 0, top: 0, behavior: 'instant' }]);
	});

	it('stops the tween without issuing more frames when disposed', async () => {
		scroller.scrollIntoView(new Rect(0, 100, 10, 10), { behavior: 'smooth' });
		scroller.dispose();
		const count = host.calls.length;
		await settle();
		expect(host.calls).toHaveLength(count);
	});
});
