import { describe, expect, it } from 'bun:test';
import { Rect } from '../../geometry';
import { controller, settle } from './scroll-controller-harness';

describe('ScrollController', () => {
	it('instant scroll passes the axis-resolved offset straight through', () => {
		const { host, scroller } = controller();
		scroller.scrollIntoView(new Rect(150, 10, 10, 10));
		expect(host.calls).toEqual([{ left: 60, top: -6, behavior: undefined }]); // y: 10 - 16 padding
	});

	it('smooth scroll: tweens over several instant frames and lands exactly on the target', async () => {
		const { host, scroll } = controller();
		scroll(100);
		await settle();
		expect(host.calls.length).toBeGreaterThan(2); // it animated rather than snapping
		expect(host.calls.every((c) => c.behavior === 'instant')).toBe(true);
		expect(host.last()).toEqual({
			left: 0,
			top: 100,
			behavior: 'instant',
		});
	});

	it('smooth scroll: a stream of requests retargets the same tween to the latest destination', async () => {
		const { host, scroll } = controller();
		scroll(100);
		scroll(200);
		scroll(300); // latest wins; the tween redirects here
		await settle();
		expect(host.last()).toEqual({
			left: 0,
			top: 300,
			behavior: 'instant',
		});
	});

	it('snaps instantly when the travel would exceed the max scroll speed', async () => {
		const { host, scroll } = controller();
		scroll(5000); // 5000px / 350ms far exceeds the speed cap
		expect(host.calls).toEqual([{ left: 0, top: 5000, behavior: 'instant' }]);
		await settle();
		expect(host.calls).toHaveLength(1); // one snap, no tween frames
	});

	it('cancel halts the tween at the current offset and issues no further frames', async () => {
		const { host, scroller, scroll } = controller();
		scroll(100);
		host.scroll = { left: 0, top: 40 }; // wherever the tween happens to be mid-flight
		scroller.cancel();
		expect(host.last()).toEqual({ left: 0, top: 40, behavior: 'instant' });
		const count = host.calls.length;
		await settle();
		expect(host.calls).toHaveLength(count); // no more frames after cancel
	});

	it('suspendForResize: cancels the in-flight tween, drops scrolls, then resumes once settled', async () => {
		const { host, scroller, scroll } = controller();
		scroll(100); // in flight
		scroller.suspendForResize(); // cancels it to the current offset, blocks new scrolls
		scroll(200); // dropped while suspended
		const count = host.calls.length;
		await settle();
		expect(host.calls).toHaveLength(count); // nothing scrolled while suspended
		scroll(300); // suspension lifted after the settle window
		await settle();
		expect(host.last()).toEqual({
			left: 0,
			top: 300,
			behavior: 'instant',
		});
	});

	it('suspendForResize: a repeated call during the burst only cancels once', () => {
		const { host, scroller } = controller();
		scroller.suspendForResize();
		scroller.suspendForResize();
		scroller.suspendForResize();
		expect(host.calls).toEqual([{ left: 0, top: 0, behavior: 'instant' }]);
	});

	it('dispose stops the tween without issuing more frames', async () => {
		const { host, scroller, scroll } = controller();
		scroll(100);
		scroller.dispose();
		const count = host.calls.length;
		await settle();
		expect(host.calls).toHaveLength(count);
	});
});
