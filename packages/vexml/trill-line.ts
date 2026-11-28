import {
	Accidental,
	Modifier,
	type Stave,
	type StaveNote,
	Stroke,
	VibratoBracket,
} from 'vexflow/core';
import { StaveOrnament } from './stave-ornament';

/* Air between the right edge of the `tr` sign and the start of the wavy line, in stave spaces. */
const TRILL_SIGN_GAP_SPACES = 0.2;
/* Air before a following notehead or accidental, in stave spaces. */
const NEXT_NOTE_GAP_SPACES = 0.15;
/* Air before a closing barline so the wavy line does not collide with it, in stave spaces. */
const BARLINE_GAP_SPACES = 0.15;
/* Vertical alignment inside `tr`: slightly below midpoint to sit level with the body of the `r`. */
const TRILL_CENTER_RATIO = 0.55;
/* Minimum fraction of a single wiggle glyph needed before drawing one in a tight gap. */
const MIN_SINGLE_WIGGLE_RATIO = 0.7;
/* Default SMuFL wiggleTrill glyph codepoint used by VexFlow's Vibrato. */
const DEFAULT_VIBRATO_CODE = 0xeab0;

export type TrillLineEnd =
	| { kind: 'before-note'; note: StaveNote }
	| { kind: 'barline'; stave: Stave };

/*
 * A trill extension line (<notations><ornaments><wavy-line>) engraved to Behind Bars p. 136:
 * starts directly after the `tr` sign (vertically aligned with it), and runs to just before
 * the following notehead/accidental or the closing barline (across tied notes for their full
 * duration) without overshooting its endpoint.
 */
export class TrillLine extends VibratoBracket {
	private vibratoCode = DEFAULT_VIBRATO_CODE;

	constructor(
		private readonly startNote: StaveNote,
		stopNote: StaveNote,
		readonly end: TrillLineEnd,
	) {
		super({ start: startNote, stop: stopNote });
	}

	override setVibratoCode(code: number): this {
		this.vibratoCode = code;
		return super.setVibratoCode(code);
	}

	override draw(): void {
		const ctx = this.checkContext();
		this.setRendered();
		const stave = this.startNote.checkStave();
		const space = stave.getSpacingBetweenLines();
		const { startX, y } = this.startOrigin(stave, space);
		const stopX = this.stopEdge(space);
		const available = stopX - startX;
		if (available <= 0) {
			return;
		}
		const code = String.fromCodePoint(this.vibratoCode);
		this.vibrato.setText(code);
		const unitWidth = this.vibrato.getWidth();
		if (unitWidth <= 0) {
			return;
		}
		let count = Math.floor(available / unitWidth);
		if (count === 0 && available >= unitWidth * MIN_SINGLE_WIGGLE_RATIO) {
			count = 1;
		}
		if (count <= 0) {
			return;
		}
		this.vibrato.setText(code.repeat(count));
		const ink = this.vibrato.getTextInk(0, 0);
		this.vibrato.renderText(ctx, startX - ink.x, y);
	}

	/* Where the wavy line starts: right after the `tr` sign and level with it, or at the
	 * start note's x and default top text line for a standalone wavy line with no `tr`. */
	private startOrigin(
		stave: Stave,
		space: number,
	): { startX: number; y: number } {
		const trill = this.startNote
			.getModifiers()
			.find(
				(mod): mod is StaveOrnament =>
					mod instanceof StaveOrnament && mod.isTrill,
			);
		if (!trill) {
			return {
				startX: this.startNote.getAbsoluteX(),
				y: stave.getYForTopText(this.line),
			};
		}
		const trBox = trill.getBoundingBox();
		// Read the `tr` glyph's own ink (excluding any upper/lower accidental) so the wavy
		// line aligns vertically with `tr` rather than the combined ornament+accidental box.
		const trInk = trill.getTextInk(trill.getX(), trill.getY());
		const code = String.fromCodePoint(this.vibratoCode);
		this.vibrato.setText(code);
		const wiggleInk = this.vibrato.getTextInk(0, 0);
		const targetCenterY = trInk.y + trInk.h * TRILL_CENTER_RATIO;
		const y = targetCenterY - (wiggleInk.y + wiggleInk.h / 2);
		return {
			startX: trBox.getX() + trBox.getW() + TRILL_SIGN_GAP_SPACES * space,
			y,
		};
	}

	/* Rightmost x the wavy line may reach: just before the target note's leftmost ink
	 * (including accidentals) or just before the closing barline. */
	private stopEdge(space: number): number {
		if (this.end.kind === 'barline') {
			return (
				this.end.stave.getX() +
				this.end.stave.getWidth() -
				BARLINE_GAP_SPACES * space
			);
		}
		return this.noteLeftEdge(this.end.note) - NEXT_NOTE_GAP_SPACES * space;
	}

	private noteLeftEdge(note: StaveNote): number {
		let left = note.getNoteHeadBeginX();
		for (const head of note.noteHeads) {
			if (head.isRendered()) {
				left = Math.min(left, head.getBoundingBox().getX());
			}
		}
		for (const mod of note.getModifiers()) {
			if (mod.getPosition() !== Modifier.Position.LEFT) {
				continue;
			}
			if (mod instanceof Accidental) {
				left = Math.min(left, mod.getInkBounds().getX());
			} else if (mod.getCategory() === Stroke.CATEGORY) {
				const start = note.getModifierStartXY(
					Modifier.Position.LEFT,
					mod.checkIndex(),
				);
				left = Math.min(left, start.x + mod.getXShift() - mod.getWidth());
			}
		}
		return left;
	}
}
