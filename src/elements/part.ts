import type { MElement, Part as MPart } from '@stringsync/mdom';
import type { Measure } from './measure';

/*
 * A part (usually an instrument), document-scoped: the root of the musical axis. Not an Element —
 * it has no box of its own (its measures fragment across systems); it's a navigation node from
 * the score down to the interactive Notes. Analysis beyond the accessors here (clefs, keys,
 * times, ...) goes through the mdom part in getSources().
 */
export class Part {
	constructor(
		private readonly mpart: MPart,
		/* This part's measures in document order; the factory fills the array before any query. */
		private readonly measureList: readonly Measure[],
	) {}

	getSources(): readonly MElement[] {
		return [this.mpart];
	}

	/* The MusicXML part id, e.g. "P1". */
	getId(): string {
		return this.mpart.id;
	}

	/* The display name from the part list, e.g. "Guitar"; null when the document names none. */
	getLabel(): string | null {
		return this.mpart.label;
	}

	getMeasures(): Measure[] {
		return [...this.measureList];
	}
}
