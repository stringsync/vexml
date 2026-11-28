import {
	Accidental,
	Metrics,
	type ModifierContext,
	StaveNote,
	Stroke,
	type Voice,
} from 'vexflow/core';
import { STAVE_LINE_DISTANCE } from './constants';

/** Left-edge step (in stave spaces) between tucked flats a fifth apart. */
const TUCKED_FLAT_STEP_SPACES = 0.56;

/**
 * Tuck the lower flat of a two-accidental fifth partly under the upper flat,
 * overlapping horizontally without touching (Behind Bars p. 88). Naturals and
 * closer intervals keep their full column offset so vertical strokes stay clear.
 * Runs after `Formatter.joinVoices` in both width planning and final formatting so
 * the saved left shift is reflected in measure widths and drawing alike.
 */
export function tuckChordAccidentals(voices: Voice[]): void {
	const seen = new Set<ModifierContext>();
	for (const voice of voices) {
		for (const tickable of voice.getTickables()) {
			const context = tickable.getModifierContext();
			if (!context || seen.has(context)) {
				continue;
			}
			seen.add(context);
			tuckClearAccidentals(context);
			tuckPair(context);
		}
	}
}

/**
 * Where a displaced notehead sits left of the stem, VexFlow clears every accidental of
 * the chord past it. An accidental with vertical room above or below the displaced
 * head needs no such clearance, so move it back over that head, closer to the stem
 * (Behind Bars p. 90). Runs before the fifth tuck so both see the settled columns.
 */
function tuckClearAccidentals(context: ModifierContext): void {
	const accidentals = context
		.getMembers(Accidental.CATEGORY)
		.filter((m): m is Accidental => m instanceof Accidental);
	if (accidentals.length === 0) {
		return;
	}
	context.preFormat();
	let extra = 0;
	const displacedLines: number[] = [];
	const seenNotes = new Set<StaveNote>();
	for (const accidental of accidentals) {
		const note = accidental.getNote();
		if (!(note instanceof StaveNote) || seenNotes.has(note)) {
			continue;
		}
		seenNotes.add(note);
		extra = Math.max(extra, note.getLeftDisplacedHeadPx() - note.getXShift());
		for (const props of note.getKeyProps()) {
			if (props.displaced && note.getStemDirection() < 0) {
				displacedLines.push(props.line);
			}
		}
	}
	if (extra <= 0 || displacedLines.length === 0) {
		return;
	}
	const placed = accidentals
		.map((accidental) => ({ accidental, line: lineOf(accidental) }))
		.filter(
			(p): p is { accidental: Accidental; line: number } => p.line !== null,
		);
	for (const { accidental, line } of placed) {
		if ((accidental as unknown as { sharedWith?: unknown }).sharedWith) {
			continue;
		}
		const note = accidental.getNote();
		if (
			!(note instanceof StaveNote) ||
			note.getKeyProps()[accidental.checkIndex()]?.displaced
		) {
			continue;
		}
		const dist = -accidental.getXShift();
		const target = dist - extra;
		if (target < 0) {
			continue;
		}
		const isFlat = accidental.type === 'b';
		const clear = displacedLines.every((head) => {
			// Lines grow upward: a head below the accidental is at a lower line.
			const below = head < line;
			let needed = 2;
			if (isFlat) {
				needed = below ? 1.5 : 2.5;
			}
			return Math.abs(line - head) >= needed;
		});
		if (!clear) {
			continue;
		}
		// Never move into the column of a nearer accidental it would collide with.
		const blocked = placed.some(
			(other) =>
				other.accidental !== accidental &&
				Math.abs(other.line - line) < 3 &&
				-other.accidental.getXShift() < dist,
		);
		if (blocked) {
			continue;
		}
		accidental.setXShift(target);
	}
}

function tuckPair(context: ModifierContext): void {
	const accidentals = context
		.getMembers(Accidental.CATEGORY)
		.filter((m): m is Accidental => m instanceof Accidental);
	if (accidentals.length !== 2) {
		return;
	}
	const [first, second] = accidentals;
	if (!first || !second || !isTuckableFlat(first) || !isTuckableFlat(second)) {
		return;
	}
	const firstLine = lineOf(first);
	const secondLine = lineOf(second);
	if (firstLine === null || secondLine === null) {
		return;
	}
	// A fifth is four diatonic steps (2.0 staff lines).
	if (Math.abs(firstLine - secondLine) !== 2) {
		return;
	}
	if (first.fontSizeInPoints !== second.fontSizeInPoints) {
		return;
	}
	context.preFormat();
	// Modifier.setXShift negates left-positioned shifts, so getXShift() is
	// negative: a larger distance (-getXShift()) sits further left.
	const [near, far] =
		-first.getXShift() <= -second.getXShift()
			? [first, second]
			: [second, first];
	const nearDist = -near.getXShift();
	const farDist = -far.getXShift();
	if (farDist <= nearDist) {
		return;
	}
	const staffSpace =
		near.getNote().getStave()?.getSpacingBetweenLines() ?? STAVE_LINE_DISTANCE;
	const baseFontSize = Metrics.get('Accidental.fontSize') || 30;
	const fontScale = Math.min(1, far.fontSizeInPoints / baseFontSize);
	const step = staffSpace * TUCKED_FLAT_STEP_SPACES * fontScale;
	const targetDist = nearDist + near.getWidth() + step - far.getWidth();
	const saved = farDist - targetDist;
	if (saved <= 0) {
		return;
	}
	far.setXShift(targetDist);
	context.getState().leftShift = Math.max(
		0,
		context.getState().leftShift - saved,
	);
	for (const stroke of context.getMembers(Stroke.CATEGORY)) {
		if (stroke instanceof Stroke) {
			stroke.setXShift(-stroke.getXShift() - saved);
		}
	}
}

function isTuckableFlat(accidental: Accidental): boolean {
	return accidental.type === 'b' && !accidental.isCautionary();
}

function lineOf(accidental: Accidental): number | null {
	const note = accidental.getNote();
	if (!(note instanceof StaveNote)) {
		return null;
	}
	return note.getKeyProps()[accidental.checkIndex()]?.line ?? null;
}
