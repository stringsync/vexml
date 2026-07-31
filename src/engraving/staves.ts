import { MElement, type Measure, type Part } from '@stringsync/mdom';

/** True when `<staff-details>` gives this staff both string tunings and an explicit
 * `<staff-lines>` — the MusicXML signal for tablature that doesn't depend on the clef.
 *
 * Tuning alone is not enough: Guitar Pro copies a guitar's six `<staff-tuning>`s onto the
 * *notation* staff of a notation+tab part (and onto unrelated parts sharing the
 * instrument), where they mean nothing. A real tab staff always sizes itself with
 * `<staff-lines>`, so requiring both keeps those spurious tunings from turning notation
 * staves into tab. */
function hasStaffTuning(measure: Measure, staffNumber: string): boolean {
	for (const attributes of measure.childrenNamed('attributes')) {
		for (const details of attributes.childrenNamed('staff-details')) {
			const number = details.getAttribute('number') ?? '1';
			if (
				number === staffNumber &&
				details.childrenNamed('staff-tuning').length > 0 &&
				details.child('staff-lines') !== null
			) {
				return true;
			}
		}
	}
	return false;
}

const STEP_SEMITONES: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};

/** MIDI number of a step/octave/alter, the common scale tuning and pitches compare on. */
export function midiOf(step: string, octave: number, alter = 0): number {
	return (octave + 1) * 12 + (STEP_SEMITONES[step.toUpperCase()] ?? 0) + alter;
}

/**
 * The open-string MIDI pitches of a tab staff's `<staff-tuning>`, indexed by string
 * number - 1 (so index 0 = string 1 = the highest-sounding string). MusicXML numbers
 * tuning *lines* from the bottom up and strings from the top down, so they invert:
 * string = lineCount - line + 1.
 *
 * Null when the staff declares no tunings — there is nothing to derive a fret from, so
 * callers keep their explicit-fret-only behavior rather than guessing a tuning.
 */
export function stringTuning(part: Part, staffNumber: string): number[] | null {
	for (const measure of part.measures) {
		for (const attributes of measure?.childrenNamed('attributes') ?? []) {
			for (const details of attributes.childrenNamed('staff-details')) {
				if ((details.getAttribute('number') ?? '1') !== staffNumber) {
					continue;
				}
				const tunings = details.childrenNamed('staff-tuning');
				if (tunings.length === 0) {
					continue;
				}
				const lineCount = Math.max(
					...tunings.map((t) => Number(t.getAttribute('line') ?? 1)),
				);
				const midis: number[] = [];
				for (const tuning of tunings) {
					const line = Number(tuning.getAttribute('line') ?? 1);
					const step = tuning.child('tuning-step')?.text ?? 'C';
					const octave = Number(tuning.child('tuning-octave')?.text ?? 4);
					const alter = Number(tuning.child('tuning-alter')?.text ?? 0);
					midis[lineCount - line] = midiOf(step, octave, alter);
				}
				return midis;
			}
		}
	}
	return null;
}

/** A staff is tablature when its clef sign is TAB, or when `<staff-details>` gives it
 * string tunings — some exporters (Guitar Pro, Soundslice) notate a tab staff with an
 * octave-down treble clef, so the clef sign alone doesn't settle it. A staff's clef is
 * stable across a part, so the first measure that declares either settles it. */
export function isTabStaff(part: Part, staffNumber: string): boolean {
	for (const measure of part.measures) {
		if (measure && hasStaffTuning(measure, staffNumber)) {
			return true;
		}
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

/** A `<part-group>` span: the run of parts it brackets, and the connector to draw. */
export type PartGroup = {
	/** Index into the rendered `parts` array of the group's first and last part. */
	fromPart: number;
	toPart: number;
	symbol: 'brace' | 'bracket' | 'line';
	/** Nesting depth — 0 is outermost, and each level draws further left of the system. */
	depth: number;
	/** The group's `<group-name>`, printed left of its symbol; null when it declares none. */
	name: string | null;
};

/*
 * The part boundaries a measure's barlines must NOT run across: entry `i` means the barline
 * between rendered part `i` and part `i + 1` stops instead of continuing down.
 *
 * A barline runs through the staves of ONE part — that is what a part's brace/bracket means —
 * and stops at every part boundary, which is how an engraver separates one instrument from the
 * next (MuseScore draws this score exactly so: the singer's barline stops, the guitar's runs
 * through its notation and TAB together). A `<part-group>` is what joins parts back up, and it
 * does so unless it declares `<group-barline>no</group-barline>` — MusicXML defines no default
 * for an absent one, so a declared group is read as asking for common barlines.
 *
 * A nested pair that disagrees resolves to "any 'no' covering the boundary breaks it", since
 * the inner group is the one closest to the staves — hence the two passes rather than deleting
 * from a running set, which would let an outer 'yes' erase an inner 'no'.
 */
export function barlineBreaks(parts: Part[]): Set<number> {
	const joined = new Set<number>();
	const broken = new Set<number>();
	for (const group of partGroupEntries(parts)) {
		for (let at = group.fromPart; at < group.toPart; at++) {
			(group.barline === 'no' ? broken : joined).add(at);
		}
	}
	const breaks = new Set<number>();
	for (let at = 0; at < parts.length - 1; at++) {
		if (!joined.has(at) || broken.has(at)) {
			breaks.add(at);
		}
	}
	return breaks;
}

/*
 * The `<part-group>` spans declared in the `<part-list>`, outermost first.
 *
 * MusicXML declares groups as flat start/stop markers interleaved with the `<score-part>`
 * entries, paired by `number`, so a group's extent is "the parts between its start and its
 * stop" — read here by walking the list in document order and closing each start when its
 * numbered stop arrives. Nesting depth is how many other groups were open when this one
 * started, which is what decides how far outside the system its symbol is drawn.
 *
 * Groups whose `<group-symbol>` is absent or 'none' draw no connector — they exist only to
 * carry a name or a barline rule (see barlineBreaks). 'square' falls back to 'bracket'
 * (vexflow draws no squared bracket). A group is also dropped when its parts aren't
 * contiguous in the rendered set, or when it spans only one part with nothing to connect.
 *
 * ponytail: `<group-abbreviation>` is ignored — it's the short name for systems after the
 * first, and vexml prints part labels on the first system only, so nothing would ever use it.
 */
export function partGroups(parts: Part[]): PartGroup[] {
	return (
		partGroupEntries(parts)
			// A group with no symbol draws no connector — it exists only to carry a name or a
			// barline rule — and one spanning a single part has nothing to connect.
			.filter((group) => group.symbol !== null && group.toPart > group.fromPart)
			.map(({ fromPart, toPart, symbol, depth, name }) => ({
				fromPart,
				toPart,
				symbol: symbol as PartGroup['symbol'],
				depth,
				name,
			}))
			.sort((a, b) => a.depth - b.depth)
	);
}

/* One `<part-group>` as the `<part-list>` declares it, before any drawing decision: symbol
 * still nullable, single-part and symbol-less spans still included (they can carry a
 * `<group-barline>` or a `<group-name>`). See partGroups for the walk this performs. */
type PartGroupEntry = {
	fromPart: number;
	toPart: number;
	symbol: PartGroup['symbol'] | null;
	depth: number;
	name: string | null;
	barline: string | null;
};

function partGroupEntries(parts: Part[]): PartGroupEntry[] {
	const partList = parts[0]?.parent?.child('part-list');
	if (!partList) {
		return [];
	}
	const groups: PartGroupEntry[] = [];
	// number -> the still-open start marker it belongs to.
	const open = new Map<string, Omit<PartGroupEntry, 'toPart'>>();
	let seen = 0; // parts passed so far, so a start knows where its span begins
	for (const entry of partList.children) {
		if (!(entry instanceof MElement)) {
			continue;
		}
		if (entry.tag === 'score-part') {
			seen += 1;
			continue;
		}
		if (entry.tag !== 'part-group') {
			continue;
		}
		const number = entry.getAttribute('number') ?? '1';
		if (entry.getAttribute('type') === 'stop') {
			const start = open.get(number);
			open.delete(number);
			// `seen` counts parts BEFORE this marker, so the last member is seen - 1.
			if (start && seen - 1 >= start.fromPart) {
				groups.push({ ...start, toPart: seen - 1 });
			}
			continue;
		}
		open.set(number, {
			symbol: groupSymbol(entry.child('group-symbol')?.text ?? null),
			fromPart: seen,
			depth: open.size,
			name: entry.child('group-name')?.text || null,
			barline: entry.child('group-barline')?.text ?? null,
		});
	}
	// The <score-part> entries are in the same order as the <part> elements, so the counted
	// positions index `parts` directly; a malformed list that runs past the end is dropped.
	return groups.filter((g) => g.fromPart >= 0 && g.toPart < parts.length);
}

/** MusicXML `<group-symbol>` -> the connector vexml draws. null means "draw nothing". */
function groupSymbol(symbol: string | null): PartGroup['symbol'] | null {
	switch (symbol) {
		case 'brace':
			return 'brace';
		case 'bracket':
		// vexflow has no squared-bracket connector; a bracket is the nearest reading.
		case 'square':
			return 'bracket';
		case 'line':
			return 'line';
		default:
			return null;
	}
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
