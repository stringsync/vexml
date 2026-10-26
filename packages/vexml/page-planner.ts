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
		const walk = this.walk();
		const pushes = new Map<number, number>();
		// How far the systems from here on have been pushed down so far.
		let shift = 0;
		extents.forEach((extent, index) => {
			const push = walk.place({
				top: extent.top + shift,
				bottom: extent.bottom + shift,
			});
			if (push > 0) {
				pushes.set(index, push);
				shift += push;
			}
		});
		return { pushes, ...walk.result() };
	}

	/* A plan taken one system at a time, as each is drawn where the earlier pushes put it. */
	walk(): PageWalk {
		return new PageWalk(this.pageHeight, this.margin);
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
		private readonly margin: number,
	) {}

	/*
	 * Place the next system, whose ink `extent` spans in the drawing's space as it stands with
	 * every earlier push applied. Returns how far to push it down to start its page (0 to leave
	 * it); the extent it then occupies is the one given, moved down by that much.
	 */
	place(extent: SystemExtent): number {
		const { height, margin } = this;
		if (this.index === 0) {
			this.cropTop = extent.top - margin;
		}
		const top = extent.top - this.cropTop;
		this.bottom = extent.bottom - this.cropTop;
		const pageTop = this.page * height + margin;
		const pageBottom = (this.page + 1) * height - margin;
		let pushed = 0;
		if (this.index > 0 && this.bottom > pageBottom && top > pageTop) {
			this.page += 1;
			pushed = Math.max(0, this.page * height + margin - top);
			this.bottom += pushed;
		}
		// A system too tall for its page ends on a later one; the next system goes there too.
		this.page = Math.max(
			this.page,
			Math.floor((this.bottom - margin) / height),
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
				Math.ceil((this.bottom + this.margin) / this.height),
			),
		};
	}
}
