/* The minimal seam a ScrollController needs from its stage: the score->rendered CSS scale, the
 * base canvas's offset within the scroll content, the container's current scroll offsets and
 * visible client size, and the scrollTo that moves the scroll box. Stage implements it; a unit
 * test injects a FakeScrollHost. */
export interface ScrollHost {
	frame(): { sx: number; sy: number };
	baseOffset(): { left: number; top: number };
	readonly scroll: { left: number; top: number };
	clientSize(): { width: number; height: number };
	scrollTo(options: ScrollToOptions): void;
}
