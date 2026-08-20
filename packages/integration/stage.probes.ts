import { render, type Score } from '@stringsync/vexml';

/** Mount a second Stage (a fresh render of `xml`) into the live container, then dispose
 * the first — the keep-old-until-new-ready pattern — and report the scroll-box styles
 * before and after. Guards the LIFO style-restore bug. */
export async function rerenderKeepsScrollBox(
	first: Score,
	container: HTMLDivElement,
	xml: string,
) {
	const before = {
		overflowY: getComputedStyle(container).overflowY,
		position: getComputedStyle(container).position,
	};
	// Mount the second Stage while the first is still bound, then dispose the first.
	await render(xml, container, { height: 200 });
	first.dispose();
	const after = {
		overflowY: getComputedStyle(container).overflowY,
		position: getComputedStyle(container).position,
		scrollHeight: container.scrollHeight,
		clientHeight: container.clientHeight,
	};
	return { before, after };
}

/** setMaxHeight live: cap the container to 100px, then uncap, without re-rendering. */
export function capUncapHeight(score: Score, container: HTMLDivElement) {
	const canvas = container.querySelector('.vexml-canvas');
	// Computed height, not clientHeight: max-height caps the content box, and the harness
	// container has padding that clientHeight would fold in.
	const natural = parseFloat(getComputedStyle(container).height);

	score.setMaxHeight(100);
	const capped = {
		height: parseFloat(getComputedStyle(container).height),
		scrollHeight: container.scrollHeight,
		overflowY: getComputedStyle(container).overflowY,
		sameCanvas: container.querySelector('.vexml-canvas') === canvas,
	};

	score.setMaxHeight(null);
	return {
		natural,
		capped,
		uncapped: parseFloat(getComputedStyle(container).height),
	};
}

/** Constrain the container and apply a plain (no !important) caller rule scaling the
 * canvas to it; report the widths that resolve. */
export function callerCssScales(_score: Score, container: HTMLDivElement) {
	const canvas = container.querySelector('.vexml-canvas') as HTMLCanvasElement;
	const intrinsic = parseFloat(canvas.style.getPropertyValue('--vexml-width'));
	// Default: the :where() rule renders the canvas at its intrinsic width (scale 1).
	const defaultWidth = canvas.getBoundingClientRect().width;

	// Constrain the container narrower than the score and add a plain (no !important) rule
	// telling the canvas to fill it.
	container.style.width = '300px';
	const style = document.createElement('style');
	style.textContent = '.vexml-canvas { width: 100%; height: auto }';
	document.head.appendChild(style);
	// Force layout, then measure. Compare against the container's content-box width
	// (getComputedStyle.width), since the canvas's width:100% resolves against that, not the
	// padded clientWidth.
	const scaledWidth = canvas.getBoundingClientRect().width;
	const contentWidth = parseFloat(getComputedStyle(container).width);
	style.remove();

	return { intrinsic, defaultWidth, scaledWidth, contentWidth };
}

/** Squeeze then widen the container and report how the canvas fits and centers. */
export function fitAndCenter(_score: Score, container: HTMLDivElement) {
	const canvas = container.querySelector('.vexml-canvas') as HTMLCanvasElement;
	const intrinsicW = parseFloat(canvas.style.getPropertyValue('--vexml-width'));
	const intrinsicH = parseFloat(
		canvas.style.getPropertyValue('--vexml-height'),
	);

	// Narrower than the score: it shrinks to fill, keeping its aspect ratio.
	container.style.width = `${Math.round(intrinsicW / 2)}px`;
	const narrow = canvas.getBoundingClientRect();
	const narrowContent = parseFloat(getComputedStyle(container).width);

	// Wider than the score: it stays at its engraved width (no upscaling) and centers —
	// equal gaps to the container's content edges.
	container.style.width = `${Math.round(intrinsicW * 2)}px`;
	const padLeft = parseFloat(getComputedStyle(container).paddingLeft);
	const padRight = parseFloat(getComputedStyle(container).paddingRight);
	const wide = canvas.getBoundingClientRect();
	const box = container.getBoundingClientRect();
	const gapLeft = wide.left - (box.left + padLeft);
	const gapRight = box.right - padRight - wide.right;

	return {
		intrinsicW,
		aspect: intrinsicW / intrinsicH,
		narrowW: narrow.width,
		narrowAspect: narrow.width / narrow.height,
		narrowContent,
		wideW: wide.width,
		gapLeft,
		gapRight,
	};
}
