import type { Measure as MMeasure } from '@stringsync/mdom';
import type { Rect } from 'webappwiz/geometry';
import { Element } from './element';
import type { StaveModel } from './element-model';
import type { MeasureBox } from './measure-box';
import type { Part } from './part';
import { Stave } from './stave';
import type { Viewport } from './viewport';
import type { Voice } from './voice';

/* One part's measure: its own stave rect, musical source, and unambiguous voices. */
export class Measure extends Element {
	readonly type = 'measure';

	constructor(
		rect: Rect,
		viewport: Viewport,
		/* Its mdom measure, or null when built from a snapshot. */
		private readonly source: MMeasure | null,
		private readonly number: string,
		private readonly index: number,
		private readonly part: Part,
		private readonly column: MeasureBox,
		private readonly voiceList: readonly Voice[],
		/* Its drawn staves; a progressive render's arrive as its system is drawn (see drawn). */
		private staveList: readonly StaveModel[],
	) {
		super(rect, viewport);
	}

	/* Empty when the score was rendered from a snapshot, which holds no document. */
	getSources(): readonly MMeasure[] {
		return this.source ? [this.source] : [];
	}

	/* The MusicXML measure number, e.g. "1" (or "0" for a pickup). */
	getNumber(): string {
		return this.number;
	}

	/* The 0-based position among the part's measures (stable; distinct from the printed number). */
	getIndex(): number {
		return this.index;
	}

	getPart(): Part {
		return this.part;
	}

	/* The layout join: the cross-part column this measure was engraved in (rect, system). */
	getBox(): MeasureBox {
		return this.column;
	}

	/* All voices in this measure, in first-appearance order; group by getStave() for per-stave. */
	getVoices(): Voice[] {
		return [...this.voiceList];
	}

	/* Its staves as drawn, top to bottom: where each one's lines sit. Empty in a progressive
	 * render until its system is drawn. */
	getStaves(): Stave[] {
		return this.staveList.map(
			(s) => new Stave(s.staff, s.lines, s.left, s.right, s.noteStartX),
		);
	}

	/* Take the staves and per-part rect its system's draw placed. */
	drawn(staves: readonly StaveModel[], rect: Rect): void {
		this.staveList = staves;
		this.relocate(rect);
	}
}
