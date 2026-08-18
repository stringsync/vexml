import { SCROLL_TOP_PADDING_PX } from '../constants';
import { Rect } from '../geometry';
import { FakeScrollHost } from '../scroll-host/fake-scroll-host';
import { ScrollController } from './scroll-controller';

export const controller = () => {
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
export const settle = () => new Promise((r) => setTimeout(r, 500));
