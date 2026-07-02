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

const settle = () => new Promise((r) => setTimeout(r, 600));

describe('ScrollController', () => {
	it('instant scroll passes the axis-resolved offset straight through', () => {
		const { host, scroller } = controller();
		scroller.scrollIntoView(new Rect(150, 10, 10, 10));
		expect(host.calls).toEqual([{ left: 60, top: -6, behavior: undefined }]); // y: 10 - 16 padding
	});

	it('smooth scroll: the first request fires immediately, concurrent ones are conflated', () => {
		const { host, scroll } = controller();
		scroll(10);
		scroll(20);
		scroll(30);
		expect(host.calls).toEqual([{ left: 0, top: 10, behavior: 'smooth' }]);
	});

	it('smooth scroll: the latest conflated request flushes once the settle window elapses', async () => {
		const { host, scroll } = controller();
		scroll(10);
		scroll(20);
		scroll(30);
		await settle();
		expect(host.calls).toEqual([
			{ left: 0, top: 10, behavior: 'smooth' },
			{ left: 0, top: 30, behavior: 'smooth' },
		]);
	});

	it('dedupes a repeat of the in-flight target: nothing re-issues on settle', async () => {
		const { host, scroll } = controller();
		scroll(10);
		scroll(10);
		await settle();
		expect(host.calls).toEqual([{ left: 0, top: 10, behavior: 'smooth' }]);
	});

	it('dedupes a repeat of the pending target, but a different target still retargets', async () => {
		const { host, scroll } = controller();
		scroll(10);
		scroll(20);
		scroll(20); // dropped: already the pending target
		scroll(30); // genuinely different: retargets
		await settle();
		expect(host.calls).toEqual([
			{ left: 0, top: 10, behavior: 'smooth' },
			{ left: 0, top: 30, behavior: 'smooth' },
		]);
	});

	it('cancel halts the animation at the current offset and drops the pending target', async () => {
		const { host, scroller, scroll } = controller();
		scroll(10);
		scroll(20);
		host.scroll = { left: 0, top: 5 }; // wherever the animation happens to be mid-flight
		scroller.cancel();
		expect(host.calls).toEqual([
			{ left: 0, top: 10, behavior: 'smooth' },
			{ left: 0, top: 5, behavior: 'instant' },
		]);
		await settle();
		expect(host.calls).toHaveLength(2); // the pending target never flushes
	});

	it('cancel resets the conflation window: the next smooth scroll fires immediately', () => {
		const { host, scroller, scroll } = controller();
		scroll(10);
		scroller.cancel();
		scroll(20);
		expect(host.calls).toEqual([
			{ left: 0, top: 10, behavior: 'smooth' },
			{ left: 0, top: 0, behavior: 'instant' },
			{ left: 0, top: 20, behavior: 'smooth' },
		]);
	});

	it('suspendForResize: cancels the in-flight scroll, drops scrolls, then resumes once settled', async () => {
		const { host, scroller, scroll } = controller();
		scroll(10); // in flight
		scroller.suspendForResize(); // cancels it to the current offset, blocks new scrolls
		scroll(20); // dropped while suspended
		expect(host.calls).toEqual([
			{ left: 0, top: 10, behavior: 'smooth' },
			{ left: 0, top: 0, behavior: 'instant' },
		]);
		await settle();
		scroll(30); // suspension lifted after the settle window
		expect(host.calls).toEqual([
			{ left: 0, top: 10, behavior: 'smooth' },
			{ left: 0, top: 0, behavior: 'instant' },
			{ left: 0, top: 30, behavior: 'smooth' },
		]);
	});

	it('suspendForResize: a repeated call during the burst only cancels once', () => {
		const { host, scroller } = controller();
		scroller.suspendForResize();
		scroller.suspendForResize();
		scroller.suspendForResize();
		expect(host.calls).toEqual([{ left: 0, top: 0, behavior: 'instant' }]);
	});
});
