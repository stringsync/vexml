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
