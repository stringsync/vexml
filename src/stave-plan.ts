import type { Measure, Part } from '@stringsync/mdom';

/* Which kinds of stave the caller asked to see. See Config.showTabs/showNotation. */
export interface StaveVisibility {
	showTabs: boolean;
	showNotation: boolean;
}

/*
 * Which staves a part puts on the page, and what kind each one is.
 *
 * Not a read of the document: the answer is the document's staves narrowed by what the caller
 * asked to see, so every question here needs both. The visibility is fixed for a render, so it
 * is held once here rather than threaded through the layout and draw passes that ask.
 *
 * Layout and draw both iterate this, so their stave rows — and the offsets, connectors and
 * brackets keyed off them — stay aligned.
 */
export class StavePlan {
	constructor(private readonly visibility: StaveVisibility) {}

	/**
	 * The open-string MIDI pitches of a tab staff's `<staff-tuning>`, indexed by string
	 * number - 1 (so index 0 = string 1 = the highest-sounding string). MusicXML numbers
	 * tuning *lines* from the bottom up and strings from the top down, so they invert:
	 * string = lineCount - line + 1.
	 *
	 * Null when the staff declares no tunings — there is nothing to derive a fret from, so
	 * callers keep their explicit-fret-only behavior rather than guessing a tuning.
	 */
	tuningOf(part: Part, staffNumber: string): number[] | null {
		for (const measure of part.measures) {
			const tunings = measure.getStaffTunings(staffNumber);
			if (tunings.length === 0) {
				continue;
			}
			const lineCount = Math.max(...tunings.map((t) => t.line));
			const midis: number[] = [];
			for (const tuning of tunings) {
				midis[lineCount - tuning.line] = tuning.midi;
			}
			return midis;
		}
		return null;
	}

	/** A staff is tablature when its clef sign is TAB, or when `<staff-details>` gives it
	 * string tunings — some exporters (Guitar Pro, Soundslice) notate a tab staff with an
	 * octave-down treble clef, so the clef sign alone doesn't settle it. A staff's clef is
	 * stable across a part, so the first measure that declares either settles it. */
	isTab(part: Part, staffNumber: string): boolean {
		for (const measure of part.measures) {
			if (this.hasStaffTuning(measure, staffNumber)) {
				return true;
			}
			const clef = measure.getClef(staffNumber);
			if (clef) {
				return clef.sign === 'TAB';
			}
		}
		return false;
	}

	/** The staff numbers ('1', '2', …) a part renders, in order. All of them normally; with
	 * showTabs off its tablature staves are dropped, with showNotation off its notation staves
	 * are — a notation+tab part then shows only the kept kind, and a part of the dropped kind
	 * alone shows nothing. Layout and draw both iterate this so their stave rows (and the
	 * offsets/connectors keyed off them) stay aligned. */
	visibleNumbers(part: Part): string[] {
		const { showTabs, showNotation } = this.visibility;
		const all = Array.from({ length: Math.max(part.staveCount, 1) }, (_, s) =>
			String(s + 1),
		);
		return all.filter((n) => (this.isTab(part, n) ? showTabs : showNotation));
	}

	/** True when every stave the part renders is tablature. */
	isAllTab(part: Part): boolean {
		const staves = this.visibleNumbers(part);
		return staves.length > 0 && staves.every((n) => this.isTab(part, n));
	}

	/*
	 * True when the part stacks a TAB stave with at least one non-TAB (notation) stave —
	 * the guitar notation+tab pairing, which is bracketed rather than braced by convention.
	 */
	pairsTabWithNotation(part: Part): boolean {
		// A notation+tab pairing needs both kinds on screen; hide either and it can't pair.
		if (!this.visibility.showTabs || !this.visibility.showNotation) {
			return false;
		}
		const staves = this.visibleNumbers(part);
		return (
			staves.some((n) => this.isTab(part, n)) &&
			staves.some((n) => !this.isTab(part, n))
		);
	}

	/*
	 * True when a notation+tab pair is split across separate single-stave parts (a
	 * guitar's notation in one part, its TAB in another) rather than stacked in one
	 * two-stave part. Such a system is bracketed by convention, the cross-part analog
	 * of pairsTabWithNotation. Only meaningful for multi-part systems — a single
	 * notation+tab part already brackets itself via partSymbol.
	 */
	partsPairTabWithNotation(parts: Part[]): boolean {
		// A notation+tab pairing needs both kinds on screen; hide either and it can't pair.
		if (
			!this.visibility.showTabs ||
			!this.visibility.showNotation ||
			parts.length < 2
		) {
			return false;
		}
		// A part that stacks both kinds ITSELF is not a cross-part pairing — it already brackets
		// its own two staves via partSymbol. Without this, a score that merely CONTAINS such a
		// part (a singer over a notation+TAB guitar) also brackets the whole system, sweeping the
		// unrelated part into the guitar's bracket.
		if (parts.some((part) => this.pairsTabWithNotation(part))) {
			return false;
		}
		// ponytail: the bracket still spans the whole system, which is right for the two-part
		// case this exists for. Track the pair's part indexes if a score ever puts an ungrouped
		// third part alongside a split notation/TAB pair.
		const kinds: boolean[] = [];
		for (const part of parts) {
			for (let staff = 1; staff <= Math.max(part.staveCount, 1); staff++) {
				kinds.push(this.isTab(part, String(staff)));
			}
		}
		return kinds.includes(true) && kinds.includes(false);
	}

	/*
	 * The stave connector that joins a multi-staff part's own staves. An explicit
	 * <part-symbol> in any measure's attributes wins: bracket, none (no connector), or
	 * brace (the MusicXML default; line/square fall back to it). With none declared, a
	 * guitar notation+tab pair brackets by convention, a tab+tab stack (two tunings, or a
	 * "played" and "written" pair) gets nothing — a brace would claim a grand staff that
	 * isn't one — and everything else (piano grand staves, …) braces.
	 */
	symbolOf(part: Part): 'brace' | 'bracket' | null {
		const symbol = part.partSymbol;
		if (symbol === null) {
			if (this.pairsTabWithNotation(part)) {
				return 'bracket';
			}
			return this.isAllTab(part) ? null : 'brace';
		}
		if (symbol === 'none') {
			return null;
		}
		return symbol === 'bracket' ? 'bracket' : 'brace';
	}

	/** True when `<staff-details>` gives this staff both string tunings and an explicit
	 * `<staff-lines>` — the MusicXML signal for tablature that doesn't depend on the clef.
	 *
	 * Tunings alone are not enough: Guitar Pro copies a guitar's six `<staff-tuning>`s onto
	 * the *notation* staff of a notation+tab part (and onto unrelated parts sharing the
	 * instrument), where they mean nothing. A real tab staff always sizes itself with
	 * `<staff-lines>`, so requiring both keeps those spurious tunings from turning notation
	 * staves into tab. StaffDetails is what makes this askable: Measure.getStaveLines applies
	 * the 5-line default, which erases the difference between declared and absent. */
	private hasStaffTuning(measure: Measure, staffNumber: string): boolean {
		const details = measure.getStaffDetails(staffNumber);
		return (
			!!details &&
			details.staffTunings.length > 0 &&
			details.staffLines !== null
		);
	}
}
