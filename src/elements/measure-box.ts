import type { MElement, Measure as MMeasure } from '@stringsync/mdom';
import type { Rect } from '../geometry';
import type { Viewport } from '../host/stage';
import { Element } from './element';
import type { Measure } from './measure';
import type { System } from './system';

/* A measure column's box — the full-width strip across all parts at one measure index, and the
 * background element hit when a pointer lands on staff space (not a note). Purely layout: the
 * musical content lives in the per-part Measures it joins to (getMeasures). Its `type` stays
 * 'measure' — it is what pointer events report for staff-space hits.
 * Not Highlightable in v1 (coloring a whole measure box reads as a selection, not a decoration). */
export class MeasureBox extends Element {
	readonly type = 'measure';

	constructor(
		rect: Rect,
		viewport: Viewport,
		private readonly number: string,
		private readonly index: number,
		/* One mdom Measure per part at this index (a system-wide column shares one box). */
		private readonly sources: readonly MMeasure[],
		private readonly system: System,
		/* The per-part Measures in this column; the factory fills the array before any query. */
		private readonly measureList: readonly Measure[],
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

	/* The 0-based position among the score's measures (stable; distinct from the printed number). */
	getIndex(): number {
		return this.index;
	}

	/* The system (line) this column was laid out on. */
	getSystem(): System {
		return this.system;
	}

	/* The musical content of this column: one Measure per part, in part order. */
	getMeasures(): Measure[] {
		return [...this.measureList];
	}
}
