import type { Part as MPart } from '@stringsync/mdom';
import type { Measure } from './measure';

/*
 * A part (usually an instrument), document-scoped: the root of the musical axis. Not an Element:
 * it has no box of its own (its measures fragment across systems); it's a navigation node from
 * the score down to the interactive Notes. Analysis beyond the accessors here (clefs, keys,
 * times, ...) goes through the mdom part in getSources().
 */
export class Part {
	constructor(
		/* Its mdom part, or null when built from a snapshot. */
		private readonly source: MPart | null,
		private readonly id: string,
		private readonly label: string | null,
		/* This part's measures in document order; the factory fills the array before any query. */
		private readonly measureList: readonly Measure[],
	) {}

	/* Empty when the score was rendered from a snapshot, which holds no document. */
	getSources(): readonly MPart[] {
		return this.source ? [this.source] : [];
	}

	/* The MusicXML part id, e.g. "P1". */
	getId(): string {
		return this.id;
	}

	/* The display name from the part list, e.g. "Guitar"; null when the document names none. */
	getLabel(): string | null {
		return this.label;
	}

	getMeasures(): Measure[] {
		return [...this.measureList];
	}
}
