import { describe, expect, it } from 'bun:test';
import { SCROLL_TOP_PADDING_PX } from '../constants';
import { Rect } from '../geometry';
import {
	ScrollController,
	type ScrollHost,
	scrollOffsetFor,
} from './scroll-controller';

// Both boxes are in the container's scroll-content coordinates; view = the current scroll window.
const VIEW = { left: 0, top: 0, right: 100, bottom: 100 };

describe('scrollOffsetFor', () => {
	it('x stays put when visible, y puts the target top near the viewport top (minus padding)', () => {
		const offset = scrollOffsetFor(
			{ left: 50, top: 50, right: 60, bottom: 60 },
			VIEW,
		);
		expect(offset).toEqual({ left: 0, top: 34 }); // y: 50 - 16 padding
	});

	it('off-screen right scrolls x to show the far edge, y targets top minus padding', () => {
		const offset = scrollOffsetFor(
			{ left: 150, top: 10, right: 160, bottom: 20 },
			VIEW,
		);
		expect(offset).toEqual({ left: 60, top: -6 }); // x: 0 + (160 - 100); y: 10 - 16
	});

	it('off-screen left scrolls x to the near edge, y targets top minus padding', () => {
		const offset = scrollOffsetFor(
			{ left: 20, top: 10, right: 30, bottom: 20 },
			{ left: 50, top: 0, right: 150, bottom: 100 },
		);
		expect(offset).toEqual({ left: 20, top: -6 });
	});

	it('y always targets the target top minus padding, regardless of how far down', () => {
		const offset = scrollOffsetFor(
			{ left: 10, top: 200, right: 20, bottom: 210 },
			VIEW,
		);
		expect(offset).toEqual({ left: 0, top: 184 });
	});
});

// The controller's host seam, recording every scrollTo. Score space maps 1:1 onto the scroll
// content (scale 1, base at the origin) and the visible box is 100x100, so test rects read
// directly as VIEW-coordinate target boxes.
class FakeScrollHost implements ScrollHost {
	readonly calls: ScrollToOptions[] = [];
	scroll = { left: 0, top: 0 };

	frame(): { sx: number; sy: number } {
		return { sx: 1, sy: 1 };
	}

	baseOffset(): { left: number; top: number } {
		return { left: 0, top: 0 };
	}

	clientSize(): { width: number; height: number } {
		return { width: 100, height: 100 };
	}

	scrollTo(options: ScrollToOptions): void {
		this.calls.push(options);
	}
}

const controller = () => {
	const host = new FakeScrollHost();
	const scroller = new ScrollController(host);
	// A narrow rect at x=0 is always visible horizontally (left stays 0) while y targets the rect
	// top (minus top padding). Pre-add the padding so the resulting offset `top` equals the argument,
	// keeping these conflation tests about the target identity rather than padding arithmetic.
	const scroll = (top: number) =>
		scroller.scrollIntoView(new Rect(0, top + SCROLL_TOP_PADDING_PX, 10, 10), {
			behavior: 'smooth',
		});
	return { host, scroller, scroll };
};

// Longer than SCROLL_DURATION_MS (350) so an in-flight tween has fully landed.
const settle = () => new Promise((r) => setTimeout(r, 500));
const last = (calls: ScrollToOptions[]) => calls[calls.length - 1];

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
		expect(last(host.calls)).toEqual({
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
		expect(last(host.calls)).toEqual({
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
		expect(last(host.calls)).toEqual({ left: 0, top: 40, behavior: 'instant' });
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
		expect(last(host.calls)).toEqual({
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
