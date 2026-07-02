import type { MElement } from '@stringsync/mdom';
import type { Rect } from '../geometry';
import type { Viewport } from '../host/stage';
import { Element } from './element';
import type { MeasureBox } from './measure-box';

/* A system: one line of music, the measure columns laid out on it. Layout-only — it answers
 * "where on the page" (its rect unions its columns), never "what's in the music"; content is
 * reached through each column's per-part Measures. Not in the pointer tree: staff-space hits
 * report the MeasureBox, and a system-level target would swallow it. */
export class System extends Element {
	readonly type = 'system';

	constructor(
		rect: Rect,
		viewport: Viewport,
		private readonly index: number,
		/* The measure columns on this line; the factory fills the array before any query. */
		private readonly boxList: readonly MeasureBox[],
	) {
		super(rect, viewport);
	}

	getSources(): readonly MElement[] {
		return this.boxList.flatMap((box) => box.getSources());
	}

	/* The 0-based line number, top to bottom. */
	getIndex(): number {
		return this.index;
	}

	/* The measure columns on this line, left to right. */
	getMeasureBoxes(): MeasureBox[] {
		return [...this.boxList];
	}
}
