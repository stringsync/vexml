import type { PageSize } from './document-layout';
import type { SystemExtent } from './draw-pass';
import type { DocumentPlacement, PagePlan } from './page-planner';

/* One page's frame: where it starts in the drawing, how tall it is and its vertical margins. */
type Page = {
	top: number;
	height: number;
	marginTop: number;
	marginBottom: number;
};

/* One walk down the systems of a {@link PagePlanner}. */
export class PageWalk {
	private index = 0;
	private cropTop = 0;
	private readonly pages: Page[] = [];
	private bottom = 0;
	private startPage = 0;

	constructor(
		private readonly height: number,
		private readonly marginTop: number,
		private readonly marginBottom: number,
	) {
		this.pages.push(this.openPage(0, null));
	}

	/*
	 * Place the next system, whose ink `extent` spans in the drawing's space as it stands with
	 * every earlier push applied (and its staff lines `document.lines` alike, when following the
	 * document). Returns how far to push it down to start its page (0 to leave it); the extent it
	 * then occupies is the one given, moved down by that much.
	 */
	place(extent: SystemExtent, document?: DocumentPlacement): number {
		// The first system opens the first page, so its own frame replaces the default one.
		if (this.index === 0) {
			this.pages[0] = this.openPage(0, document?.system.page ?? null);
		}
		const current = this.pages.at(-1) as Page;
		// Where a system opening a page puts its top: its top line at the document's distance,
		// or else its ink at the margin.
		const distance = document?.system.topSystemDistance ?? null;
		const anchorTop =
			distance !== null && document ? document.lines.top : extent.top;
		const anchorOffset = (marginTop: number) =>
			distance !== null && document ? marginTop + distance : marginTop;
		if (this.index === 0) {
			this.cropTop = anchorTop - anchorOffset(current.marginTop);
		}
		const top = extent.top - this.cropTop;
		this.bottom = extent.bottom - this.cropTop;
		const fitsTo = document
			? document.lines.bottom - this.cropTop
			: this.bottom;
		const pageTop = current.top + current.marginTop;
		const pageBottom = current.top + current.height - current.marginBottom;
		const forced = document?.system.startsPage ?? false;
		let pushed = 0;
		if (this.index > 0 && (forced || (fitsTo > pageBottom && top > pageTop))) {
			// Blank pages the document asks for sit between, at the default frame.
			if (forced) {
				for (let b = 0; b < (document?.system.blankPages ?? 0); b++) {
					const last = this.pages.at(-1) as Page;
					this.pages.push(this.openPage(last.top + last.height, null));
				}
			}
			const previous = this.pages.at(-1) as Page;
			const next = this.openPage(
				previous.top + previous.height,
				document?.system.page ?? null,
			);
			this.pages.push(next);
			pushed = Math.max(
				0,
				next.top + anchorOffset(next.marginTop) - (anchorTop - this.cropTop),
			);
			this.bottom += pushed;
		}
		this.startPage = this.pages.length - 1;
		// A system too tall for its page ends on a later one; the next system goes there too.
		for (;;) {
			const last = this.pages.at(-1) as Page;
			if (this.bottom < last.top + last.height + last.marginTop) {
				break;
			}
			this.pages.push(this.openPage(last.top + last.height, null));
		}
		this.index += 1;
		return pushed;
	}

	/* The page (from 0) the system placed last starts on. */
	placedPage(): number {
		return this.startPage;
	}

	/* Where the systems placed so far leave the drawing: its crop and pages. */
	result(): Pick<PagePlan, 'cropTop' | 'pageCount' | 'pageHeights'> {
		if (this.index === 0) {
			return { cropTop: 0, pageCount: 1, pageHeights: [this.height] };
		}
		const pages = [...this.pages];
		for (;;) {
			const last = pages.at(-1) as Page;
			if (this.bottom + last.marginBottom <= last.top + last.height) {
				break;
			}
			pages.push(this.openPage(last.top + last.height, null));
		}
		return {
			cropTop: this.cropTop,
			pageCount: pages.length,
			pageHeights: pages.map((page) => page.height),
		};
	}

	// A page at `top`: the document's own frame where it sets one, else the walk's.
	private openPage(top: number, own: PageSize | null): Page {
		return {
			top,
			height: own?.height ?? this.height,
			marginTop: own?.marginTop ?? this.marginTop,
			marginBottom: own?.marginBottom ?? this.marginBottom,
		};
	}
}
