/* The minimal seam a ScrollController needs from its stage: the score->rendered CSS scale, the
 * base canvas's offset within the scroll content, the container's current scroll offsets and
 * visible client size, how much of its left edge a sticky fold covers, and the scrollTo that
 * moves the scroll box. Stage implements it; a unit
 * test injects a FakeScrollHost. */
export interface ScrollHost {
	frame(): { sx: number; sy: number };
	baseOffset(): { left: number; top: number };
	readonly scroll: { left: number; top: number };
	clientSize(): { width: number; height: number };
	/* Client px at the scrollport's left edge that a sticky fold hides (0 without one). */
	leftInset(): number;
	scrollTo(options: ScrollToOptions): void;
}
