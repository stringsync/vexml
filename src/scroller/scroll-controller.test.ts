import { beforeEach, describe, expect, it } from 'bun:test';
import { Rect } from '../geometry';
import { FakeScrollHost } from '../scroll-host/fake-scroll-host';
import { ScrollController } from './scroll-controller';

// Longer than SCROLL_DURATION_MS (350) so an in-flight tween has fully landed.
const settle = () => new Promise((r) => setTimeout(r, 500));

// Every target below is a narrow rect at x=0, which is always visible horizontally (left stays 0),
// so the offsets are all vertical: top lands at the rect's y minus the 16px of headroom
// scrollOffsetFor leaves above it.
describe('ScrollController', () => {
	let host: FakeScrollHost;
	let scroller: ScrollController;

	beforeEach(() => {
		host = new FakeScrollHost();
		scroller = new ScrollController(host);
	});

	it('passes the axis-resolved offset straight through on an instant scroll', () => {
		scroller.scrollIntoView(new Rect(150, 10, 10, 10));
		expect(host.calls).toEqual([{ left: 60, top: -6, behavior: undefined }]);
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
