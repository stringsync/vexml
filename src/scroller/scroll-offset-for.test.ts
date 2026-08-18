import { describe, expect, it } from 'bun:test';
import { scrollOffsetFor } from './scroll-controller';

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
