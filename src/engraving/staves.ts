import type { Part } from '@stringsync/mdom';

/** A staff is tablature when its clef sign is TAB. A staff's clef is stable across a
 * part, so the first measure that declares one settles it. */
function isTabStaff(part: Part, staffNumber: string): boolean {
	for (const measure of part.measures) {
		const clef = measure?.getClef(staffNumber);
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
export function visibleStaffNumbers(
	part: Part,
	showTabs: boolean,
	showNotation: boolean,
): string[] {
	const all = Array.from({ length: Math.max(part.staveCount, 1) }, (_, s) =>
		String(s + 1),
	);
	return all.filter((n) => (isTabStaff(part, n) ? showTabs : showNotation));
}

/** True when every stave the part renders is tablature. */
export function isAllTabPart(
	part: Part,
	showTabs: boolean,
	showNotation: boolean,
): boolean {
	const staves = visibleStaffNumbers(part, showTabs, showNotation);
	return staves.length > 0 && staves.every((n) => isTabStaff(part, n));
}

/*
 * True when the part stacks a TAB stave with at least one non-TAB (notation) stave —
 * the guitar notation+tab pairing, which is bracketed rather than braced by convention.
 */
export function pairsTabWithNotation(
	part: Part,
	showTabs: boolean,
	showNotation: boolean,
): boolean {
	// A notation+tab pairing needs both kinds on screen; hide either and it can't pair.
	if (!showTabs || !showNotation) {
		return false;
	}
	const staves = visibleStaffNumbers(part, showTabs, showNotation);
	return (
		staves.some((n) => isTabStaff(part, n)) &&
		staves.some((n) => !isTabStaff(part, n))
	);
}

/*
 * The stave connector that joins a multi-staff part's own staves. An explicit
 * <part-symbol> in any measure's attributes wins: bracket, none (no connector), or
 * brace (the MusicXML default; line/square fall back to it). With none declared, a
 * guitar notation+tab pair brackets by convention, a tab+tab stack (two tunings, or a
 * "played" and "written" pair) gets nothing — a brace would claim a grand staff that
 * isn't one — and everything else (piano grand staves, …) braces.
 */
export function partSymbol(
	part: Part,
	showTabs: boolean,
	showNotation: boolean,
): 'brace' | 'bracket' | null {
	const symbol = part.partSymbol;
	if (symbol === null) {
		if (pairsTabWithNotation(part, showTabs, showNotation)) {
			return 'bracket';
		}
		return isAllTabPart(part, showTabs, showNotation) ? null : 'brace';
	}
	if (symbol === 'none') {
		return null;
	}
	return symbol === 'bracket' ? 'bracket' : 'brace';
}
