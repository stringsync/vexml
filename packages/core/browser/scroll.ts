/** An element, or a way of finding one that only mounts on a later render. */
export type ScrollTarget = HTMLElement | null | (() => HTMLElement | null);

export interface RevealOptions {
	/** Which edge to bring into view. Defaults to `"end"`, the bottom. */
	block?: "start" | "end" | "center";
	/**
	 * Extra room to leave at the bottom, for something overlapping it that the
	 * target cannot know about, such as a sticky footer.
	 */
	bottomInset?: number;
}

/**
 * Scrolling something into view once it has laid out.
 *
 * ```ts
 * collapse.open();
 * Scroll.reveal(() => panelRef.current, { bottomInset: footerHeight });
 * ```
 *
 * Every method waits for layout, leaves the page alone when the target is
 * already fully visible, and honours `prefers-reduced-motion`. Only the latest
 * request survives: a burst of calls settles on one scroll rather than fighting
 * over the page.
 */
export class Scroll {
	private static pending = 0;

	private constructor() {}

	/** Brings the target into view, by default its bottom edge. */
	static reveal(target: ScrollTarget, opts: RevealOptions = {}): void {
		const block = opts.block ?? "end";
		const bottomInset = opts.bottomInset ?? 0;
		Scroll.run(() => {
			const element = resolve(target);
			if (element === null || isVisible(element, bottomInset)) {
				return;
			}
			if (bottomInset > 0) {
				// Added on top of whatever scroll-margin the element already carries
				// rather than replacing it: the element owns its breathing room and
				// only the caller knows what is covering the fold. Clearing the
				// inline value first is what stops repeat calls compounding.
				element.style.scrollMarginBottom = "";
				const own =
					Number.parseFloat(getComputedStyle(element).scrollMarginBottom) || 0;
				element.style.scrollMarginBottom = `${own + bottomInset}px`;
			}
			element.scrollIntoView({ behavior: scrollBehavior(), block });
		});
	}

	/** Brings the top of the target to the top of whatever scrolls it. */
	static toTop(target: ScrollTarget): void {
		Scroll.run(() => {
			const element = resolve(target);
			if (element === null || isVisible(element)) {
				return;
			}
			element.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
		});
	}

	/** Scrolls the page to the bottom, e.g. to bring a sticky action into view. */
	static toPageBottom(): void {
		Scroll.run(() => {
			window.scrollTo({
				top: document.documentElement.scrollHeight,
				behavior: scrollBehavior(),
			});
		});
	}

	// Two frames: the first lets the expand or the render commit, the second
	// lets layout settle so the measurements below are of the final position.
	// Cancelling the previous one is what makes a burst settle on one scroll.
	private static run(scroll: () => void): void {
		cancelAnimationFrame(Scroll.pending);
		Scroll.pending = requestAnimationFrame(() => {
			Scroll.pending = requestAnimationFrame(scroll);
		});
	}
}

/** `"auto"` when the user asked for less motion, `"smooth"` otherwise. */
export function scrollBehavior(): ScrollBehavior {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches
		? "auto"
		: "smooth";
}

function resolve(target: ScrollTarget): HTMLElement | null {
	return typeof target === "function" ? target() : target;
}

// The viewport is not the whole answer: a scrollable ancestor clips its
// children, so a target just past that fold sits inside the viewport while
// being invisible. Those ancestors are exactly what scrollIntoView would
// scroll, so the visible band is clamped to every one of them.
function isVisible(element: HTMLElement, bottomInset = 0): boolean {
	let top = 0;
	let bottom = window.innerHeight - bottomInset;
	for (
		let parent = element.parentElement;
		parent;
		parent = parent.parentElement
	) {
		const overflowY = getComputedStyle(parent).overflowY;
		if (overflowY === "auto" || overflowY === "scroll") {
			const bounds = parent.getBoundingClientRect();
			top = Math.max(top, bounds.top);
			bottom = Math.min(bottom, bounds.bottom);
		}
	}
	const bounds = element.getBoundingClientRect();
	return bounds.top >= top && bounds.bottom <= bottom;
}
