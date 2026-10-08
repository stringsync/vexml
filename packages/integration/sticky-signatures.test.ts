import { describe, expect, it } from 'bun:test';
import type { ConfigInput } from '@stringsync/vexml';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

// A sticky panoramic score pins its clefs and keys at the scroll box's left edge as the opening
// reaches it, folded over the music like a page. These scroll the render container sideways and
// check what the fold shows, that it tracks clef and key changes, and that the music under it
// can't be pointed at or scrolled to.

const WIDTH = 420;
const STICKY: ConfigInput = {
	layout: { type: 'panoramic', stickySignatures: true },
	width: WIDTH,
};

type Scroll = { fraction: number };

describe('stickySignatures', () => {
	it.concurrent('pins a guitar notation+tab opening past the fold', async () => {
		const { image } = await scrolled('score_amazing_grace.musicxml', 0.5);
		expect(image).toMatchScreenshot('sticky_signatures_notation_tab.png');
	});

	it.concurrent('shows the key in effect under the fold', async () => {
		const { image } = await scrolled('key.musicxml', 1);
		expect(image).toMatchScreenshot('sticky_signatures_key_change.png');
	});

	it.concurrent('follows clef changes on a grand staff', async () => {
		const { image } = await scrolled('score_debussy_mandoline.musicxml', 0.6);
		expect(image).toMatchScreenshot('sticky_signatures_clef_change.png');
	});

	it.concurrent('sticks as soon as the opening reaches the edge', async () => {
		const { image, result } = await testing.eval(
			'score_wanna_skip_class.musicxml',
			STICKY,
			probe,
		);
		expect(result.shownAtStart).toBe(false);
		// Like CSS sticky: the fold catches the opening the moment it reaches the edge.
		expect(result.shownNudged).toBe(true);
		expect(result.shownScrolled).toBe(true);
		expect(result.foldWidth).toBeGreaterThan(0);
		// Pinned flush against the scroll box's left edge, and over its padding top to bottom.
		expect(result.foldLeft).toBeCloseTo(result.edge, 0);
		expect(result.padding).toBeGreaterThan(0);
		expect(result.foldTop).toBeCloseTo(result.boxTop, 0);
		expect(result.foldBottom).toBeGreaterThanOrEqual(result.boxBottom - 0.5);
		// The music under the fold can't be hovered.
		expect(result.hoveredUnderFold).toBe(false);
		// A cursor scrolled into view lands just right of the fold, not under it.
		expect(result.barLeft).toBeGreaterThanOrEqual(
			result.edge + result.foldWidth,
		);
		expect(result.barLeft).toBeLessThan(result.edge + result.foldWidth + 40);
		expect(result.visible).toBe(true);
		expect(image).toMatchScreenshot('sticky_signatures_cursor.png');
	});

	it.concurrent('leaves the DOM alone when off', async () => {
		const { result } = await testing.eval(
			'score_wanna_skip_class.musicxml',
			{ layout: { type: 'panoramic' }, width: WIDTH },
			({ container }) => container.querySelector('.vexml-fold') !== null,
		);
		expect(result).toBe(false);
	});
});

function scrolled(file: string, fraction: number) {
	return testing.eval(
		file,
		STICKY,
		async ({ container }: VexmlContext, s: Scroll) => {
			container.scrollLeft =
				(container.scrollWidth - container.clientWidth) * s.fraction;
			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => requestAnimationFrame(resolve));
		},
		{ fraction } satisfies Scroll,
	);
}

// Runs in the page, so it's self-contained: eval serializes it, and nothing outside it exists there.
async function probe({ score, container }: VexmlContext) {
	const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
	const fold = container.querySelector('.vexml-fold') as HTMLDivElement;
	const shown = () => getComputedStyle(fold).visibility === 'visible';
	await frame();
	const shownAtStart = shown();
	// Barely scroll: the opening has only just reached the edge.
	container.scrollLeft = 2;
	await frame();
	await frame();
	const shownNudged = shown();
	container.scrollLeft = 0;
	await frame();
	// The first layout is a resize, and scrolling holds off until resizes settle.
	await new Promise((resolve) => setTimeout(resolve, 300));

	// Seek past the middle: a bar right of the view scrolls in at the view's left edge, which is
	// where the fold is.
	const cursor = score.createCursor();
	cursor.seekMs(score.getDurationMs() * 0.6);
	cursor.scrollIntoView({ behavior: 'instant' });
	await frame();
	await frame();
	const shownScrolled = shown();

	const box = container.getBoundingClientRect();
	const edge = box.left + container.clientLeft;
	const boxTop = box.top + container.clientTop;
	const fr = fold.getBoundingClientRect();
	const rect = score.getSequence().positionAt(cursor.getTimeMs());
	const canvas = container.querySelector('.vexml-canvas') as HTMLElement;
	const cr = canvas.getBoundingClientRect();
	const barLeft = cr.left + (rect?.x ?? 0);

	let hovered: unknown = 'none';
	score.events.on('hover', (e) => {
		hovered = e.target;
	});
	container.dispatchEvent(
		new PointerEvent('pointermove', {
			clientX: fr.left + fr.width / 2,
			clientY: fr.top + fr.height / 2,
			bubbles: true,
		}),
	);

	return {
		shownAtStart,
		shownNudged,
		shownScrolled,
		edge,
		foldLeft: fr.left,
		foldTop: fr.top,
		foldBottom: fr.bottom,
		boxTop,
		boxBottom: boxTop + container.clientHeight,
		padding: parseFloat(getComputedStyle(container).paddingTop),
		foldWidth: fr.width,
		barLeft,
		visible: cursor.isFullyVisible(),
		hoveredUnderFold: hovered !== 'none' && hovered !== null,
	};
}
