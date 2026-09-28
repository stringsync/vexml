import type { Resource } from 'webappwiz/disposable';
import type { MarkerRect } from './marker';

/** A loupe's size, magnification and placement. Sizes are CSS px; anything omitted keeps its
 * current value (vexml's default on creation). */
export interface LoupeOptions {
	width?: number;
	height?: number;
	/** How many times larger than the score shows on screen. Lower trades detail for context. */
	zoom?: number;
	/** Corner radius. */
	radius?: number;
	/** The space kept between the loupe and the anchor it is shown against. */
	gap?: number;
}

/* A magnifier floating over the page: a small fixed-position canvas that repaints the score around
 * a point, for a finger that covers what it is dragging. Painting a few thousand pixels per pointer
 * move is cheap where repainting a score-sized layer isn't. */
export interface Loupe extends Resource {
	/* Magnify the score around `at` (score px; the anchor's center when omitted) and float the loupe
	 * just above `anchor` (score px) — what's being dragged, e.g. the cursor bar a change event
	 * reports, or a loop marker — so neither it nor the thumb below it is covered. Where the
	 * viewport's top edge leaves no room above, the loupe sits right of the anchor (where reading
	 * goes next), else left of it. */
	show(anchor: MarkerRect, at?: { x: number; y: number }): void;
	hide(): void;
	/* Change any of the options; a showing loupe redraws in place. */
	configure(options: LoupeOptions): void;
}

/* The seam for making loupes: Stage satisfies it; a unit test injects a fake. The options arrive
 * complete (see resolveLoupeOptions). */
export interface LoupeHost {
	createLoupe(options: Required<LoupeOptions>): Loupe;
}

/* Lay `patch` over `base`, rejecting a size or zoom that isn't positive and a negative radius or
 * gap, so a bad value fails where it was passed. */
export function resolveLoupeOptions(
	base: Required<LoupeOptions>,
	patch: LoupeOptions,
): Required<LoupeOptions> {
	// Only known keys, and an explicit undefined keeps the current value rather than erasing it.
	const given = Object.entries(patch).filter(
		([key, value]) => key in base && value !== undefined,
	);
	const options: Required<LoupeOptions> = {
		...base,
		...(Object.fromEntries(given) as LoupeOptions),
	};
	const { width, height, zoom, radius, gap } = options;
	const positive = [width, height, zoom].every(
		(v) => Number.isFinite(v) && v > 0,
	);
	const nonNegative = [radius, gap].every((v) => Number.isFinite(v) && v >= 0);
	if (!positive || !nonNegative) {
		throw new Error(
			'vexml: loupe width, height and zoom must be positive, radius and gap non-negative',
		);
	}
	return options;
}
