import type { MElement, Measure as MMeasure } from '@stringsync/mdom';
import type { Rect } from '../geometry';
import type { Viewport } from '../host/stage';
import { Element } from './element';

/* A measure's box — the background element, hit when a pointer lands on staff space (not a note).
 * Not Highlightable in v1 (coloring a whole measure box reads as a selection, not a decoration). */
export class Measure extends Element {
	readonly type = 'measure';

	constructor(
		rect: Rect,
		viewport: Viewport,
		private readonly number: string,
		private readonly index: number,
		/* One mdom Measure per part at this index (a system-wide column shares one box). */
		private readonly sources: readonly MMeasure[],
	) {
		super(rect, viewport);
	}

	getSources(): readonly MElement[] {
		return this.sources;
	}

	/* The MusicXML measure number, e.g. "1" (or "0" for a pickup). */
	getNumber(): string {
		return this.number;
	}

	/* The 0-based position among the part's measures (stable; distinct from the printed number). */
	getIndex(): number {
		return this.index;
	}
}
