import type { Measure as MMeasure } from '@stringsync/mdom';
import type { MeasureBox } from './measure-box';
import type { Part } from './part';
import type { Voice } from './voice';

/*
 * One part's measure: the musical node, from a single mdom Measure. Not an Element: it has
 * no box of its own in v1 (only the cross-part column is measured); getBox() is its place on the
 * page. This is where voices live unambiguously: a MeasureBox spans all parts, so "whose
 * voices?" only has an answer here.
 */
export class Measure {
	constructor(
		/* Its mdom measure, or null when built from a snapshot. */
		private readonly source: MMeasure | null,
		private readonly number: string,
		private readonly index: number,
		private readonly part: Part,
		private readonly box: MeasureBox,
		private readonly voiceList: readonly Voice[],
	) {}

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
		return this.box;
	}

	/* All voices in this measure, in first-appearance order; group by getStave() for per-stave. */
	getVoices(): Voice[] {
		return [...this.voiceList];
	}
}
