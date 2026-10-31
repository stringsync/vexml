import type { SystemExtent } from './draw-pass';
import type { DocumentSystem } from './layout-planner';
import { PageWalk } from './page-walk';

/* Where pagination put the systems: how far down to push each system that starts a new page
 * (by system index, never the first), how far the drawing's origin is cropped so the first
 * system's ink starts at the top margin, and how many pages that fills. */
export interface PagePlan {
	pushes: Map<number, number>;
	cropTop: number;
	pageCount: number;
	/* Each page's height, top to bottom: all alike unless the document sets a page's own. */
	pageHeights: number[];
}

/* What following the document adds to pagination: each system's staff-line span, in the
 * drawing's space like its ink, and what the document says of it. */
export interface DocumentPages {
	lines: readonly SystemExtent[];
	systems: readonly DocumentSystem[];
}

/* Pairs the staff-line span a system is laid out at with what the document says of it. */
export interface DocumentPlacement {
	lines: SystemExtent;
	system: DocumentSystem;
}

/*
 * Fits systems onto pages without splitting one: walking down the score, a system whose ink
 * would cross its page's bottom margin moves to the top margin of the next page, and every system
 * after it moves with it. A system taller than the space between the margins starts its page
 * anyway and runs into the bottom margin, and on into the next page if it has to; the system
 * after it starts below its ink.
 *
 * Following the document, a system fits by its staff lines rather than its ink, so a low note
 * hangs into the bottom margin as it does in print; a system opening a page puts its top staff
 * line its top-system-distance below the top margin instead of its ink at the margin; and a
 * system the document starts a page with starts one whether or not it fits, after the blank
 * pages it asks for (not before the first system, which opens the drawing). A system opening a
 * page may also carry that page's own height and top and bottom margins (a `<print>`
 * page-layout), which the page keeps until the next one opens.
 */
export class PagePlanner {
	constructor(
		private readonly pageHeight: number,
		private readonly marginTop: number,
		private readonly marginBottom: number,
	) {}

	/* `extents` are each system's ink, top to bottom, in the drawing's space. */
	plan(extents: readonly SystemExtent[], document?: DocumentPages): PagePlan {
		const walk = this.walk();
		const pushes = new Map<number, number>();
		// How far the systems from here on have been pushed down so far.
		let shift = 0;
		extents.forEach((extent, index) => {
			const lines = document?.lines[index];
			const system = document?.systems[index];
			const push = walk.place(
				{ top: extent.top + shift, bottom: extent.bottom + shift },
				lines && system
					? {
							lines: { top: lines.top + shift, bottom: lines.bottom + shift },
							system,
						}
					: undefined,
			);
			if (push > 0) {
				pushes.set(index, push);
				shift += push;
			}
		});
		return { pushes, ...walk.result() };
	}

	/* A plan taken one system at a time, as each is drawn where the earlier pushes put it. */
	walk(): PageWalk {
		return new PageWalk(this.pageHeight, this.marginTop, this.marginBottom);
	}
}
