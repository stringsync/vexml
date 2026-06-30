import { expect, test } from 'bun:test';
import { Stage, scrollOffsetFor } from './stage';

// Both boxes are in the container's scroll-content coordinates; view = the current scroll window.
const VIEW = { left: 0, top: 0, right: 100, bottom: 100 };

test('scrollOffsetFor: x stays put when visible, y pins the target top to the viewport top', () => {
	const offset = scrollOffsetFor(
		{ left: 50, top: 50, right: 60, bottom: 60 },
		VIEW,
	);
	expect(offset).toEqual({ left: 0, top: 50 });
});

test('scrollOffsetFor: off-screen right scrolls x to show the far edge, y pins to target top', () => {
	const offset = scrollOffsetFor(
		{ left: 150, top: 10, right: 160, bottom: 20 },
		VIEW,
	);
	expect(offset).toEqual({ left: 60, top: 10 }); // x: 0 + (160 - 100)
});

test('scrollOffsetFor: off-screen left scrolls x to the near edge, y pins to target top', () => {
	const offset = scrollOffsetFor(
		{ left: 20, top: 10, right: 30, bottom: 20 },
		{ left: 50, top: 0, right: 150, bottom: 100 },
	);
	expect(offset).toEqual({ left: 20, top: 10 });
});

test('scrollOffsetFor: y always pins the target top, regardless of how far down', () => {
	const offset = scrollOffsetFor(
		{ left: 10, top: 200, right: 20, bottom: 210 },
		VIEW,
	);
	expect(offset).toEqual({ left: 0, top: 200 });
});

// Drives Stage.scrollIntoView's smooth-scroll conflation against a stub container — no DOM needed.
// Object.create skips the DOM-heavy constructor; smoothScrollTo only touches container.scrollTo.
const stubStage = () => {
	const calls: ScrollToOptions[] = [];
	const stage = Object.create(Stage.prototype) as {
		container: { scrollTo: (o: ScrollToOptions) => void };
		smoothScrollTo: (
			o: { left: number; top: number },
			b: ScrollBehavior,
		) => void;
	};
	stage.container = { scrollTo: (o: ScrollToOptions) => calls.push(o) };
	const scroll = (left: number) =>
		stage.smoothScrollTo({ left, top: 0 }, 'smooth');
	return { calls, scroll };
};

test('smooth scroll: the first request fires immediately, concurrent ones are conflated', () => {
	const { calls, scroll } = stubStage();
	scroll(10);
	scroll(20);
	scroll(30);
	expect(calls).toEqual([{ left: 10, top: 0, behavior: 'smooth' }]);
});

test('smooth scroll: the latest conflated request flushes once the settle window elapses', async () => {
	const { calls, scroll } = stubStage();
	scroll(10);
	scroll(20);
	scroll(30);
	await new Promise((r) => setTimeout(r, 600));
	expect(calls).toEqual([
		{ left: 10, top: 0, behavior: 'smooth' },
		{ left: 30, top: 0, behavior: 'smooth' },
	]);
});
