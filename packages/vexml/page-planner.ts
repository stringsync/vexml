import type { SystemExtent } from './draw-pass';
import type { DocumentSystem } from './layout-planner';

/* Where pagination put the systems: how far down to push each system that starts a new page
 * (by system index, never the first), how far the drawing's origin is cropped so the first
 * system's ink starts at the top margin, and how many pages that fills. */
export interface PagePlan {
	pushes: Map<number, number>;
	cropTop: number;
	pageCount: number;
}

/* What following the document adds to pagination: each system's staff-line span, in the
 * drawing's space like its ink, and what the document says of it. */
export interface DocumentPages {
	lines: readonly SystemExtent[];
	systems: readonly DocumentSystem[];
}

/* One system as following the document places it: its staff-line span and what the document
 * says of it. */
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
 * pages it asks for (not before the first system, which opens the drawing).
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

/* One walk down the systems of a {@link PagePlanner}. */
export class PageWalk {
	private index = 0;
	private cropTop = 0;
	private page = 0;
	private bottom = 0;

	constructor(
		private readonly height: number,
		private readonly marginTop: number,
		private readonly marginBottom: number,
	) {}

	/*
	 * Place the next system, whose ink `extent` spans in the drawing's space as it stands with
	 * every earlier push applied (and its staff lines `document.lines` alike, when following the
	 * document). Returns how far to push it down to start its page (0 to leave it); the extent it
	 * then occupies is the one given, moved down by that much.
	 */
	place(extent: SystemExtent, document?: DocumentPlacement): number {
		const { height, marginBottom } = this;
		const marginTop = this.marginTop;
		// Where a system opening a page puts its top: its top line at the document's distance,
		// or else its ink at the margin.
		const distance = document?.system.topSystemDistance ?? null;
		const anchor =
			distance !== null && document
				? { top: document.lines.top, offset: marginTop + distance }
				: { top: extent.top, offset: marginTop };
		if (this.index === 0) {
			this.cropTop = anchor.top - anchor.offset;
		}
		const top = extent.top - this.cropTop;
		this.bottom = extent.bottom - this.cropTop;
		const fitsTo = document
			? document.lines.bottom - this.cropTop
			: this.bottom;
		const pageTop = this.page * height + marginTop;
		const pageBottom = (this.page + 1) * height - marginBottom;
		const forced = document?.system.startsPage ?? false;
		let pushed = 0;
		if (this.index > 0 && (forced || (fitsTo > pageBottom && top > pageTop))) {
			this.page += 1 + (forced ? (document?.system.blankPages ?? 0) : 0);
			pushed = Math.max(
				0,
				this.page * height + anchor.offset - (anchor.top - this.cropTop),
			);
			this.bottom += pushed;
		}
		// A system too tall for its page ends on a later one; the next system goes there too.
		this.page = Math.max(
			this.page,
			Math.floor((this.bottom - marginTop) / height),
		);
		this.index += 1;
		return pushed;
	}

	/* Where the systems placed so far leave the drawing: its crop and page count. */
	result(): Pick<PagePlan, 'cropTop' | 'pageCount'> {
		if (this.index === 0) {
			return { cropTop: 0, pageCount: 1 };
		}
		return {
			cropTop: this.cropTop,
			pageCount: Math.max(
				this.page + 1,
				Math.ceil((this.bottom + this.marginBottom) / this.height),
			),
		};
	}
}
