import type { SystemExtent } from './draw-pass';

/* Where pagination put the systems: how far down to push each system that starts a new page
 * (by system index, never the first), how far the drawing's origin is cropped so the first
 * system's ink starts at the top margin, and how many pages that fills. */
export interface PagePlan {
	pushes: Map<number, number>;
	cropTop: number;
	pageCount: number;
}

/*
 * Fits systems onto pages without splitting one: walking down the score, a system whose ink
 * would cross its page's bottom margin moves to the top margin of the next page, and every system
 * after it moves with it. A system taller than the space between the margins starts its page
 * anyway and runs into the bottom margin, and on into the next page if it has to; the system
 * after it starts below its ink.
 */
export class PagePlanner {
	constructor(
		private readonly pageHeight: number,
		private readonly margin: number,
	) {}

	/* `extents` are each system's ink, top to bottom, in the drawing's space. */
	plan(extents: readonly SystemExtent[]): PagePlan {
		const pushes = new Map<number, number>();
		const first = extents[0];
		if (!first) {
			return { pushes, cropTop: 0, pageCount: 1 };
		}
		const height = this.pageHeight;
		const margin = this.margin;
		const cropTop = first.top - margin;
		// How far the systems from here on have been pushed down so far, and the page in use.
		let shift = 0;
		let page = 0;
		let bottom = 0;
		extents.forEach((extent, index) => {
			const top = extent.top + shift - cropTop;
			bottom = extent.bottom + shift - cropTop;
			const pageTop = page * height + margin;
			const pageBottom = (page + 1) * height - margin;
			if (index > 0 && bottom > pageBottom && top > pageTop) {
				page += 1;
				const push = Math.max(0, page * height + margin - top);
				shift += push;
				bottom += push;
				pushes.set(index, push);
			}
			// A system too tall for its page ends on a later one; the next system goes there too.
			page = Math.max(page, Math.floor((bottom - margin) / height));
		});
		return {
			pushes,
			cropTop,
			pageCount: Math.max(page + 1, Math.ceil((bottom + margin) / height)),
		};
	}
}
