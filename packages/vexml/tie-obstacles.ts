import type { StaveNote } from 'vexflow/core';
import { tieLineBand } from './dashed-tie';

/* Ledger-line overhang past a notehead and clearance margin around each ledger line, in spaces. */
const LEDGER_OVERHANG = 0.3;
const LEDGER_PAD = 0.15;

/* Staff-line bands [lo, hi] occupied by other voices' ledger lines across a tie's span. */
export function otherVoiceLedgerBands(
	rowNotes: readonly { note: StaveNote; voice: string }[],
	voice: string,
	from: StaveNote,
	to: StaveNote,
	space: number,
): [number, number][] {
	const tieLeft = from.getNoteHeadBeginX();
	const tieRight = to.getNoteHeadEndX();
	const overhang = LEDGER_OVERHANG * space;
	const bands: [number, number][] = [];
	for (const other of rowNotes) {
		if (other.voice === voice) {
			continue;
		}
		if ('ledgerLinesShown' in other.note && !other.note.ledgerLinesShown) {
			continue;
		}
		if (
			other.note.getNoteHeadEndX() + overhang <= tieLeft ||
			other.note.getNoteHeadBeginX() - overhang >= tieRight
		) {
			continue;
		}
		const numLines = other.note.getStave()?.getNumLines() ?? 5;
		const props = other.note.getKeyProps();
		if (props.length === 0) {
			continue;
		}
		let minLine = Infinity;
		let maxLine = -Infinity;
		for (const { line } of props) {
			if (line < minLine) {
				minLine = line;
			}
			if (line > maxLine) {
				maxLine = line;
			}
		}
		if (maxLine >= numLines + 1) {
			bands.push([numLines + 1 - LEDGER_PAD, Math.floor(maxLine) + LEDGER_PAD]);
		}
		if (minLine <= 0) {
			bands.push([Math.ceil(minLine) - LEDGER_PAD, LEDGER_PAD]);
		}
	}
	return bands;
}

/* Whether an added (untied) note on `to` carries an accidental on `dir`'s side of `line`
 * close enough to collide with a tie curving in `dir`. */
export function addedAccidentalHitsSide(
	to: StaveNote,
	tiedToIndices: ReadonlySet<number>,
	line: number,
	dir: number,
	lengthInSpaces: number,
): boolean {
	const [min, max] = tieLineBand(line, dir, true, lengthInSpaces);
	const props = to.getKeyProps();
	for (const mod of to.getModifiers()) {
		if (mod.getCategory() !== 'Accidental') {
			continue;
		}
		const idx = mod.getIndex();
		if (idx === undefined || tiedToIndices.has(idx)) {
			continue;
		}
		const accLine = props[idx]?.line;
		if (accLine === undefined) {
			continue;
		}
		if (dir > 0 ? accLine >= line : accLine <= line) {
			continue;
		}
		const [lo, hi] = accidentalLineBand(
			accLine,
			'type' in mod && typeof mod.type === 'string' ? mod.type : '',
		);
		if (min <= hi && max >= lo) {
			return true;
		}
	}
	return false;
}

function accidentalLineBand(line: number, type: string): [number, number] {
	if (type === 'b' || type === 'bb') {
		return [line - 0.85, line + 1.85];
	}
	if (type === '##' || type === 'x') {
		return [line - 0.65, line + 0.65];
	}
	return [line - 1.55, line + 1.55];
}
