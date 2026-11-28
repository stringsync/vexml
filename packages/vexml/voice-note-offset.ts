import {
	Dot,
	type ModifierContext,
	StaveNote,
	Stem,
	type Tickable,
	type Voice,
} from 'vexflow/core';
import { ChordDot } from './chord-dot';
import { LowerVoiceDot } from './lower-voice-dot';
import { offsetAlteredUnison } from './voice-altered-unison';

/** Space between crossed chord parts, so neither stem reads as the other's. */
const CROSSED_CHORD_GAP = 3;

/** Notes on a stave that open (start) or close (stop) a tie. */
export type VoiceTieEnds = {
	starts: ReadonlySet<StaveNote>;
	stops: ReadonlySet<StaveNote>;
};

/** Reserve the offset during both width planning and final formatting. */
export function offsetAdjacentVoices(
	voices: Voice[],
	ties?: VoiceTieEnds,
): void {
	if (voices.length < 2) {
		return;
	}
	for (const voice of voices) {
		for (const tickable of voice.getTickables()) {
			offsetPair(tickable, ties);
		}
	}
}

function offsetPair(tickable: Tickable, ties?: VoiceTieEnds): void {
	const context = tickable.getModifierContext();
	const members = context?.getMembers(StaveNote.CATEGORY);
	if (!context || members?.length !== 2 || members[0] !== tickable) {
		return;
	}
	const [first, second] = members;
	if (
		!(first instanceof StaveNote && second instanceof StaveNote) ||
		first.getVoice() === second.getVoice()
	) {
		return;
	}
	const [up, down] =
		first.getStemDirection() === Stem.DOWN &&
		second.getStemDirection() === Stem.UP
			? [second, first]
			: [first, second];
	const upDots = Dot.getDots(up);
	const downDots = Dot.getDots(down);
	if (keepsDotAbove(up, upDots, down, downDots)) {
		LowerVoiceDot.release(down);
	}
	const unison = up.getKeyProps()[0]?.line === down.getKeyProps()[0]?.line;
	if (
		unison &&
		dottedWholeNote(up, upDots) &&
		dottedWholeNote(down, downDots)
	) {
		// Each head and its dots form a column. Leave the first column room
		// for every dot before placing the second head, so neither dot hides
		// under or crowds the other head.
		formatPair(
			context,
			members,
			second,
			down,
			dottedHeadColumnWidth(up, upDots),
		);
		return;
	}
	if (unison && separatedDottedUnison(up, upDots, down, downDots)) {
		// The unison heads touch, as plain unlike heads do, and every dot
		// follows both heads, stacked on separate spaces when both voices
		// are dotted, matching MuseScore (Behind Bars p. 59).
		const shift =
			Math.max(up.getVoiceShiftWidth(), down.getVoiceShiftWidth()) + 2;
		formatPair(context, members, second, down, shift);
		if (downDots.length === 0) {
			shiftDots(upDots, dotOriginX(down) - dotOriginX(up));
			return;
		}
		LowerVoiceDot.release(down);
		const extra = alignDotColumns(up, upDots, down, downDots);
		if (extra > 0) {
			context.getState().rightShift += extra;
		}
		assignDotRows(up, upDots, down, downDots);
		return;
	}
	if (
		!plainStemmedNote(up) ||
		!plainStemmedNote(down) ||
		up.getStemDirection() !== Stem.UP ||
		down.getStemDirection() !== Stem.DOWN
	) {
		return;
	}
	if (
		upDots.length === 0 &&
		downDots.length === 0 &&
		offsetAlteredUnison(
			context,
			members,
			second,
			up,
			down,
			ties ? tiedRightNote(up, down, ties) : null,
			formatPair,
		)
	) {
		return;
	}
	const upLines = up.getKeyProps().map(({ line }) => line);
	const downLines = new Set(down.getKeyProps().map(({ line }) => line));
	const gap = Math.min(...upLines) - Math.max(...downLines);
	const crossed = gap < 0;
	const singleNotes = upLines.length === 1 && down.keys.length === 1;
	const singleDottedUp =
		singleNotes && upDots.length > 0 && downDots.length === 0;
	if (singleNotes && gap <= -1 && (upDots.length > 0 || downDots.length > 0)) {
		// Crossed dotted heads a third or more apart sit diagonally side by
		// side, the down-stem head left and the up-stem head right, as a
		// lone crossed second does, so both stems face out. A dot on the
		// upper head alone sits over the lower head, which moves right only
		// as far as its stem needs to clear the dot (Behind Bars p. 57).
		const headShift = Math.max(up.getGlyphWidth(), down.getGlyphWidth()) * 0.98;
		const shift =
			upDots.length === 0
				? Math.max(headShift, stemClearOfDots(up, down, downDots))
				: headShift;
		formatPair(context, members, second, up, shift);
		if (upDots.length > 0 && downDots.length > 0) {
			// The shared column follows the up-stem, so it keeps half a space
			// clear of the stem as a dot does of its own head.
			const stemRight = up.getXShift() + up.getGlyphWidth();
			const halfSpace = (up.getStave()?.getSpacingBetweenLines() ?? 10) / 2;
			alignDotColumns(up, upDots, down, downDots, stemRight + halfSpace);
		}
		return;
	}
	if (crossed && !singleNotes && upDots.length > 0 && downDots.length > 0) {
		// Crossed dotted chords align all dots in one column after both chords
		// on distinct staff spaces, matching MuseScore (Behind Bars p. 58).
		context.preFormat();
		const stemRight = up.getXShift() + up.getGlyphWidth();
		const halfSpace = (up.getStave()?.getSpacingBetweenLines() ?? 10) / 2;
		const extra = alignDotColumns(
			up,
			upDots,
			down,
			downDots,
			stemRight + halfSpace,
		);
		if (extra > 0) {
			context.getState().rightShift += extra;
		}
		assignDotRows(up, upDots, down, downDots);
		return;
	}
	const bothDottedCrossed =
		singleNotes && upDots.length > 0 && downDots.length > 0 && gap === -0.5;
	const bothDottedAdjacent =
		singleNotes && upDots.length > 0 && downDots.length > 0 && gap === 0.5;
	const bothDottedSecond = bothDottedCrossed || bothDottedAdjacent;
	const dottedSecond = singleDottedUp && gap === -0.5;
	const downDottedSecond =
		gap === -0.5 && singleNotes && upDots.length === 0 && downDots.length > 0;
	if (downDottedSecond) {
		// Leave room between the inward-facing stems so neither reads as
		// an extension of the other head.
		const headWidth = Math.max(
			up.getVoiceShiftWidth(),
			down.getVoiceShiftWidth(),
		);
		formatPair(context, members, second, down, headWidth + 2 + 2 * Stem.WIDTH);
		return;
	}
	if (
		(upDots.length > 0 || downDots.length > 0) &&
		!bothDottedSecond &&
		!dottedSecond
	) {
		return;
	}

	const hasSecond = upLines.some(
		(line) => downLines.has(line + 0.5) || downLines.has(line - 0.5),
	);
	const hasUnison = upLines.some((line) => downLines.has(line));
	if (
		!bothDottedSecond &&
		(!hasSecond || hasUnison || (!crossed && gap !== 0.5))
	) {
		return;
	}

	const tieRight =
		upDots.length === 0 && downDots.length === 0 && ties
			? tiedRightNote(up, down, ties)
			: null;
	const right = tieRight ?? (crossed && !dottedSecond ? up : down);
	// At a dotted second the dot belongs between the columns. A lone
	// crossed second lets the heads touch, as the adjacent heads of a chord
	// do. Crossed chords interleave several heads, so they clear the
	// left part by a small gap and each part keeps its own column.
	// Uncrossed dotted seconds touch along their shared stem line so both
	// dots share one column after both heads (Behind Bars pp. 56-57).
	// When a tie reverses a crossed second (up left, down right), leave room
	// between the inward-facing stems so neither reads as an extension of
	// the other head (Behind Bars p. 67).
	const headWidth = Math.max(up.getGlyphWidth(), down.getGlyphWidth());
	const outerStemShift = singleNotes
		? headWidth * 0.98
		: headWidth + CROSSED_CHORD_GAP;
	const innerStemShift = bothDottedAdjacent
		? up.getGlyphWidth() - Stem.WIDTH
		: Math.max(up.getVoiceShiftWidth(), down.getVoiceShiftWidth()) +
			2 +
			(crossed ? 2 * Stem.WIDTH : 0);
	const noteShift = right === up ? outerStemShift : innerStemShift;
	const shift = dottedSecond
		? dottedHeadColumnWidth(up, upDots) + Stem.WIDTH
		: noteShift;
	formatPair(context, members, second, right, shift);
	if (bothDottedSecond) {
		alignDotColumns(up, upDots, down, downDots);
	}
}

// Place a tied notehead on the side nearest its tie so the other voice's stem
// does not sit between the note and its tie (Behind Bars p. 67): a tie start
// belongs on the right and a tie stop on the left, whenever the two voices do
// not ask for opposite orders.
function tiedRightNote(
	up: StaveNote,
	down: StaveNote,
	ties: VoiceTieEnds,
): StaveNote | null {
	const wantsUpRight = ties.starts.has(up) || ties.stops.has(down);
	const wantsDownRight = ties.starts.has(down) || ties.stops.has(up);
	if (wantsUpRight === wantsDownRight) {
		return null;
	}
	return wantsUpRight ? up : down;
}

// Shift that puts the up-stem, on the right edge of its head, just past
// the other head's dots.
function stemClearOfDots(
	up: StaveNote,
	down: StaveNote,
	downDots: Dot[],
): number {
	const dotsRight =
		down.getGlyphWidth() +
		2 +
		down.getFirstDotPx() +
		downDots.reduce((width, dot) => width + dot.getWidth() + 1, 0);
	return dotsRight + 1 + Stem.WIDTH - up.getGlyphWidth();
}

function alignDotColumns(
	up: StaveNote,
	upDots: Dot[],
	down: StaveNote,
	downDots: Dot[],
	minColumn = Number.NEGATIVE_INFINITY,
): number {
	const [firstUp] = upDots;
	const [firstDown] = downDots;
	if (!firstUp || !firstDown) {
		return 0;
	}
	const upColumn = dotOriginX(up) + firstUp.getXShift();
	const downColumn = dotOriginX(down) + firstDown.getXShift();
	const currentMax = Math.max(upColumn, downColumn);
	const target = Math.max(currentMax, minColumn);
	shiftDots(upDots, target - upColumn);
	shiftDots(downDots, target - downColumn);
	return target - currentMax;
}

function assignDotRows(
	up: StaveNote,
	upDots: Dot[],
	down: StaveNote,
	downDots: Dot[],
): void {
	const groups = new Map<string, { line: number; dots: Dot[] }>();
	// The lower voice goes first so that, at a unison, its dots take the
	// lower space and the upper voice's dots the one above.
	for (const [voice, note, dots] of [
		['d', down, downDots],
		['u', up, upDots],
	] as const) {
		const props = note.getKeyProps();
		for (const dot of dots) {
			const index = dot.checkIndex();
			const prop = props[index];
			if (!prop) {
				continue;
			}
			const key = `${voice}:${index}`;
			const entry = groups.get(key);
			if (entry) {
				entry.dots.push(dot);
			} else {
				groups.set(key, { line: prop.line, dots: [dot] });
			}
		}
	}
	const sorted = [...groups.values()].sort((a, b) => a.line - b.line);
	const rows = ChordDot.spaceRows(sorted.map(({ line }) => line));
	for (const [i, { line, dots }] of sorted.entries()) {
		const row = rows[i];
		if (row === undefined) {
			continue;
		}
		for (const dot of dots) {
			dot.setDotShiftY(line - row);
		}
	}
}

function dotOriginX(note: StaveNote): number {
	// Matches StaveNote.getModifierStartXY(RIGHT, index, { forceFlagRight: true }).
	const flag = (note as unknown as { flag?: { getWidth(): number } }).flag;
	const flagWidth =
		note.getStemDirection() === Stem.UP && note.hasFlag() && flag
			? flag.getWidth()
			: 0;
	return note.getGlyphWidth() + note.getXShift() + 2 + flagWidth;
}

function shiftDots(dots: Dot[], delta: number): void {
	if (delta === 0) {
		return;
	}
	for (const dot of dots) {
		dot.setXShift(dot.getXShift() + delta);
	}
}

function formatPair(
	context: ModifierContext,
	members: ReturnType<ModifierContext['getMembers']>,
	second: StaveNote,
	right: StaveNote,
	shift: number,
): void {
	right.setXShift(shift);
	context.getState().rightShift += shift;

	// Format all the modifiers together, bypassing only VexFlow's competing
	// two-note shift. Restore both notes for the context's post-format pass.
	members.pop();
	try {
		context.preFormat();
	} finally {
		members.push(second);
	}
}

// Width of the full dotted-note column, including the right-modifier inset.
function dottedHeadColumnWidth(note: StaveNote, dots: Dot[]): number {
	const headWidth = note.getGlyphWidth();
	const flagWidth = note.hasFlag() ? headWidth : 0;
	const dotWidth = dots.reduce((width, dot) => width + dot.getWidth() + 1, 0);
	return headWidth + flagWidth + 2 + note.getFirstDotPx() + dotWidth;
}

function dottedWholeNote(note: StaveNote, dots: Dot[]): boolean {
	return (
		note.renderOptions.draw !== false &&
		!note.isRest() &&
		note.getDuration() === 'w' &&
		note.keys.length === 1 &&
		dots.length > 0
	);
}

// Dotted single heads at a unison that cannot share a head: either both are
// dotted with different durations, or only the upper voice is dotted. The
// upper head stays left and the lower head touches it.
function separatedDottedUnison(
	up: StaveNote,
	upDots: Dot[],
	down: StaveNote,
	downDots: Dot[],
): boolean {
	return (
		plainStemmedNote(up) &&
		plainStemmedNote(down) &&
		up.keys.length === 1 &&
		down.keys.length === 1 &&
		upDots.length > 0 &&
		up.getStemDirection() === Stem.UP &&
		down.getStemDirection() === Stem.DOWN &&
		(downDots.length === 0 || up.getDuration() !== down.getDuration())
	);
}

// A lower voice's line-note dot goes below (LowerVoiceDot) except where the
// other voice's head is in the way: crossed parts, a head both voices share,
// and dotted whole notes at a unison, which keep VexFlow's own rows.
function keepsDotAbove(
	up: StaveNote,
	upDots: Dot[],
	down: StaveNote,
	downDots: Dot[],
): boolean {
	if (
		up.isRest() ||
		up.getStemDirection() !== Stem.UP ||
		down.getStemDirection() !== Stem.DOWN
	) {
		return false;
	}
	const upLowest = Math.min(...up.getKeyProps().map(({ line }) => line));
	const downHighest = Math.max(...down.getKeyProps().map(({ line }) => line));
	if (upLowest < downHighest) {
		return true;
	}
	if (upLowest > downHighest) {
		return false;
	}
	return (
		(dottedWholeNote(up, upDots) && dottedWholeNote(down, downDots)) ||
		sharedDottedHead(up, upDots, down, downDots)
	);
}

// Equally dotted single heads at a unison: VexFlow draws one head and one dot.
function sharedDottedHead(
	up: StaveNote,
	upDots: Dot[],
	down: StaveNote,
	downDots: Dot[],
): boolean {
	return (
		up.keys.length === 1 &&
		down.keys.length === 1 &&
		upDots.length > 0 &&
		upDots.length === downDots.length &&
		up.getDuration() === down.getDuration()
	);
}

function plainStemmedNote(note: StaveNote): boolean {
	return (
		note.renderOptions.draw !== false &&
		!note.isRest() &&
		note.hasStem() &&
		note.getStem()?.isVisible() === true
	);
}
