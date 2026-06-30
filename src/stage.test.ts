import { expect, test } from 'bun:test';
import { scrollOffsetFor } from './stage';

// Both boxes are in the container's scroll-content coordinates; view = the current scroll window.
const VIEW = { left: 0, top: 0, right: 100, bottom: 100 };

test('scrollOffsetFor: a fully visible target leaves both axes where they are', () => {
	const offset = scrollOffsetFor(
		{ left: 50, top: 50, right: 60, bottom: 60 },
		VIEW,
	);
	expect(offset).toEqual({ left: 0, top: 0 });
});

test('scrollOffsetFor: off-screen right scrolls x only, far edge into view', () => {
	const offset = scrollOffsetFor(
		{ left: 150, top: 10, right: 160, bottom: 20 },
		VIEW,
	);
	expect(offset).toEqual({ left: 60, top: 0 }); // 0 + (160 - 100)
});

test('scrollOffsetFor: off-screen left scrolls x only, near edge into view', () => {
	const offset = scrollOffsetFor(
		{ left: 20, top: 10, right: 30, bottom: 20 },
		{ left: 50, top: 0, right: 150, bottom: 100 },
	);
	expect(offset).toEqual({ left: 20, top: 0 });
});

test('scrollOffsetFor: off-screen below scrolls y only', () => {
	const offset = scrollOffsetFor(
		{ left: 10, top: 200, right: 20, bottom: 210 },
		VIEW,
	);
	expect(offset).toEqual({ left: 0, top: 110 }); // 0 + (210 - 100)
});

test('scrollOffsetFor: off-screen on both axes scrolls both (panoramic + tall)', () => {
	const offset = scrollOffsetFor(
		{ left: 150, top: 200, right: 160, bottom: 210 },
		VIEW,
	);
	expect(offset).toEqual({ left: 60, top: 110 });
});
