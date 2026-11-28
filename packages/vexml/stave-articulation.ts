import {
	Articulation,
	getBottomY,
	getInitialOffset,
	getTopY,
	Modifier,
	type Note,
	StaveNote,
	Stem,
} from 'vexflow/core';

export type TieClearance = 'none' | 'notehead' | 'above' | 'below' | 'both';

export interface FermataMarkOptions {
	belowGlyph?: string;
	explicitType?: boolean;
}

/*
 * An articulation that clears beams on the stem side and ties on the notehead side.
 *
 * vexflow parks a stem-side mark half a stave space off the STEM TIP, which on a beamed note
 * is exactly where the beam's ink starts: half a space of air reads as clearance over a thin
 * stem, but as a mark resting on the beam. Lift it another space when the note is beamed,
 * which is roughly what MuseScore engraves. The beam extends AWAY from the mark (down from a
 * stem-up tip), so its thickness costs nothing and the beam count doesn't matter.
 *
 * On the notehead side, a tie arcs out of the notehead through the space where vexflow parks
 * an articulation (Behind Bars p. 62, tie-articulation-clear). Shift the mark one space
 * further out when the note carries a tie on that side so the tie stays clear and the mark
 * sits outside it.
 *
 * Applied by shifting the text line for the duration of the draw rather than at format time:
 * vexflow's Articulation.format has no view of the beam or final stem direction, and a note
 * can be drawn more than once (the spill pass), so a persistent bump would ratchet.
 */
export class StaveArticulation extends Articulation {
	private tieSides: TieClearance = 'none';
	private slurSides: TieClearance = 'none';
	private baseLayoutShiftY = 0;
	private baseXShift: number | undefined;
	private isFermata = false;
	private isBowing = false;
	private bowingBelowGlyph: string | undefined;
	private fermataBelowGlyph: string | undefined;
	private explicitFermataType = false;
	private lowerVoiceBelow = false;
	private explicitPlacement = false;
	private alignToNotehead = false;
	private stackShiftY = 0;
	private tremoloTargetX: number | null = null;
	private tremoloBoundY: number | null = null;

	markFermata(opts: FermataMarkOptions = {}): this {
		this.isFermata = true;
		this.fermataBelowGlyph = opts.belowGlyph;
		this.explicitFermataType = opts.explicitType ?? false;
		return this;
	}

	get fermata(): boolean {
		return this.isFermata;
	}

	/** Mark this articulation as a string bowing sign (up-bow or down-bow) so it stacks outside fingerings. */
	markBowing(belowGlyph?: string): this {
		this.isBowing = true;
		this.bowingBelowGlyph = belowGlyph;
		return this;
	}

	get bowing(): boolean {
		return this.isBowing;
	}

	/** Vertical stacking shift (px) applied on top of beam, tie, slur, and tremolo offsets. */
	setStackShiftY(shift: number): void {
		this.stackShiftY = shift;
	}

	/** Allow multi-voice placement to route this unplaced mark below the stave for a lower voice. */
	markLowerVoiceBelow(explicitPlacement = false): this {
		this.lowerVoiceBelow = true;
		this.explicitPlacement = explicitPlacement;
		return this;
	}

	/** Align this mark horizontally with its owning notehead when displaced in an adjacent-second chord. */
	markAlignToNotehead(): this {
		this.alignToNotehead = true;
		return this;
	}

	/** Move an unplaced mark below the stave in lower-voice double-stemmed writing. */
	placeLowerVoiceBelow(): this {
		if (!this.lowerVoiceBelow || this.explicitPlacement) {
			return this;
		}
		this.setPosition(Modifier.Position.BELOW);
		if (this.isBowing && this.bowingBelowGlyph) {
			// Behind Bars p. 405 (string-bowing-lower-voice-below): inverted below the stave.
			this.setText(this.bowingBelowGlyph);
		}
		return this;
	}

	/** Invert an unplaced fermata below the stave (e.g. lower voice in double-stemmed writing). */
	invertFermata(): this {
		if (!this.isFermata || this.explicitFermataType) {
			return this;
		}
		this.setPosition(Modifier.Position.BELOW);
		if (this.fermataBelowGlyph) {
			this.setText(this.fermataBelowGlyph);
		}
		return this;
	}

	getLine(): number {
		return this.textLine;
	}

	clearTie(sides: TieClearance): this {
		this.tieSides = sides;
		return this;
	}

	clearSlur(sides: TieClearance): this {
		this.slurSides = sides;
		return this;
	}

	override setLayoutShiftY(shift: number): void {
		this.baseLayoutShiftY = shift;
		super.setLayoutShiftY(shift);
	}

	override setXShift(x: number): this {
		this.baseXShift = x;
		return super.setXShift(x);
	}

	/**
	 * Centre a fermata horizontally at `targetX` over a two-note tremolo and ensure its
	 * baseline stays outside `boundY` (above for ABOVE, below for BELOW; Behind Bars p. 188).
	 */
	centreOnTremolo(targetX: number, boundY: number | null = null): this {
		this.tremoloTargetX = targetX;
		this.tremoloBoundY = boundY;
		return this;
	}

	/** Whether this mark sits outside a slur endpoint on its side of `note`. */
	sitsOutsideSlur(note: Note): boolean {
		const stemSide =
			note.getStemDirection() === Stem.UP
				? Modifier.Position.ABOVE
				: Modifier.Position.BELOW;
		return this.matchesSide(this.slurSides, stemSide);
	}

	/**
	 * Ink bounds of this articulation after applying its beam, tie, slur, and tremolo shifts
	 * (and optionally its stacking shift). Safe before draw(): restores textLine and layoutShiftY.
	 */
	inkBounds(includeStack = true): {
		x: number;
		y: number;
		w: number;
		h: number;
	} {
		const note = this.checkAttachedNote();
		const extra = this.extraLines(note);
		const slurShift = this.slurShiftY(note);
		const tremoloShift = this.tremoloShiftY(note, extra);
		const totalShiftY =
			slurShift + tremoloShift + (includeStack ? this.stackShiftY : 0);
		const offsetX =
			this.tremoloTargetX === null ? this.noteheadOffsetX(note) : 0;
		if (extra === 0 && totalShiftY === 0 && offsetX === 0) {
			const box = this.getInkBounds();
			return { x: box.getX(), y: box.getY(), w: box.getW(), h: box.getH() };
		}
		const line = this.textLine;
		const prevShift = this.baseLayoutShiftY;
		const prevXShift = this.getXShift();
		if (extra !== 0) {
			this.setTextLine(line + extra);
		}
		if (totalShiftY !== 0) {
			super.setLayoutShiftY(prevShift + totalShiftY);
		}
		if (offsetX !== 0) {
			super.setXShift((this.baseXShift ?? prevXShift) + offsetX);
		}
		const box = this.getInkBounds();
		if (extra !== 0) {
			this.setTextLine(line);
		}
		if (totalShiftY !== 0) {
			super.setLayoutShiftY(prevShift);
		}
		if (offsetX !== 0) {
			super.setXShift(prevXShift);
		}
		return { x: box.getX(), y: box.getY(), w: box.getW(), h: box.getH() };
	}

	override draw(): void {
		const note = this.checkAttachedNote();
		const extra = this.extraLines(note);
		const slurShift = this.slurShiftY(note);
		const tremoloShift = this.tremoloShiftY(note, extra);
		const totalShiftY = slurShift + tremoloShift + this.stackShiftY;
		if (this.tremoloTargetX !== null) {
			if (this.baseXShift === undefined) {
				this.baseXShift = this.getXShift();
			}
			const baseX = note.getModifierStartXY(this.position, this.checkIndex()).x;
			super.setXShift(this.baseXShift + (this.tremoloTargetX - baseX));
		} else if (this.alignToNotehead) {
			const offsetX = this.noteheadOffsetX(note);
			if (offsetX !== 0 || this.baseXShift !== undefined) {
				if (this.baseXShift === undefined) {
					this.baseXShift = this.getXShift();
				}
				super.setXShift(this.baseXShift + offsetX);
			}
		}
		if (extra === 0 && totalShiftY === 0) {
			super.draw();
			return;
		}
		const line = this.textLine;
		const prevShift = this.baseLayoutShiftY;
		if (extra !== 0) {
			this.setTextLine(line + extra);
		}
		if (totalShiftY !== 0) {
			super.setLayoutShiftY(prevShift + totalShiftY);
		}
		super.draw();
		if (extra !== 0) {
			this.setTextLine(line);
		}
		if (totalShiftY !== 0) {
			super.setLayoutShiftY(prevShift);
		}
	}

	private noteheadOffsetX(note: Note): number {
		if (!this.alignToNotehead || !(note instanceof StaveNote)) {
			return 0;
		}
		const head = note.noteHeads[this.checkIndex()];
		return head?.isDisplaced() ? head.getDisplacementX() : 0;
	}

	/*
	 * The lowest y a BELOW mark's ink reaches once drawn, read off the same textLine and
	 * offset Articulation.draw places it with (plus the beam/tie shift draw adds), one stave
	 * space of glyph past that origin. Lets the lyric row drop clear of the mark before
	 * anything is drawn, when the mark has no bounding box yet.
	 */
	belowBottomY(): number {
		const note = this.checkAttachedNote();
		const stave = note.checkStave();
		const space = stave.getSpacingBetweenLines();
		const extra = this.extraLines(note);
		const line = this.textLine + extra;
		const y =
			getBottomY(note, line) +
			(line + getInitialOffset(note, Modifier.Position.BELOW)) * space;
		return (
			Math.max(stave.getYForBottomText(Articulation.INITIAL_OFFSET), y) +
			Math.max(
				0,
				this.slurShiftY(note) +
					this.tremoloShiftY(note, extra) +
					this.stackShiftY,
			) +
			space
		);
	}

	private tremoloShiftY(note: Note, extra: number): number {
		if (this.tremoloBoundY === null) {
			return 0;
		}
		const stave = note.getStave();
		if (!stave) {
			return 0;
		}
		const space = stave.getSpacingBetweenLines();
		const line = this.textLine + extra;
		if (this.position === Modifier.Position.ABOVE) {
			const raw =
				getTopY(note, line) -
				(line + getInitialOffset(note, Modifier.Position.ABOVE)) * space;
			const baseY =
				Math.min(stave.getYForTopText(Articulation.INITIAL_OFFSET), raw) +
				this.baseLayoutShiftY;
			return baseY > this.tremoloBoundY ? this.tremoloBoundY - baseY : 0;
		}
		if (this.position === Modifier.Position.BELOW) {
			const raw =
				getBottomY(note, line) +
				(line + getInitialOffset(note, Modifier.Position.BELOW)) * space;
			const baseY =
				Math.max(stave.getYForBottomText(Articulation.INITIAL_OFFSET), raw) +
				this.baseLayoutShiftY;
			return baseY < this.tremoloBoundY ? this.tremoloBoundY - baseY : 0;
		}
		return 0;
	}

	/*
	 * Behind Bars pp. 121–122 (slur-artic-accent-outside): shift an endpoint accent past the
	 * slur arc. Applied via layoutShiftY rather than textLine because vexflow clamps
	 * outside-stave marks to stave.getYForTopText(INITIAL_OFFSET), which swallows a
	 * textLine bump on notes inside the stave.
	 */
	private slurShiftY(note: Note): number {
		if (!this.sitsOutsideSlur(note)) {
			return 0;
		}
		const stave = note.getStave();
		if (!stave) {
			return 0;
		}
		const shift = 1.2 * stave.getSpacingBetweenLines();
		return this.position === Modifier.Position.ABOVE ? -shift : shift;
	}

	private extraLines(note: Note): number {
		const stemSide =
			note.getStemDirection() === Stem.UP
				? Modifier.Position.ABOVE
				: Modifier.Position.BELOW;
		let base = 0;
		if (note.hasStem() && this.position === stemSide) {
			base = note.hasBeam() ? 1 : 0;
		} else if (this.matchesSide(this.tieSides, stemSide)) {
			base = 1;
		}
		return base + this.ledgerExtraLines(note, base);
	}

	/*
	 * Behind Bars p. 120 (artic-ledger-outer): when an articulation on a ledger-line note sits
	 * between the notehead and the stave, push it at least into the outermost stave-space so it
	 * never crowds or collides with the ledger lines. Measured from textLine 0 (plus any beam
	 * or tie shift) so stacked marks keep their own spaces further into the stave.
	 */
	private ledgerExtraLines(note: Note, base: number): number {
		if (!this.articulation.betweenLines || !(note instanceof StaveNote)) {
			return 0;
		}
		const stave = note.getStave();
		if (!stave || stave.getNumLines() < 2) {
			return 0;
		}
		const space = stave.getSpacingBetweenLines();
		const index = this.checkIndex();
		const noteLine = Number(note.getKeyProps()[index]?.line);
		const noteY = note.getYs()[index];
		if (!Number.isFinite(noteLine) || noteY === undefined) {
			return 0;
		}
		if (this.position === Modifier.Position.BELOW) {
			const baseY =
				getBottomY(note, base) +
				(base + getInitialOffset(note, Modifier.Position.BELOW)) * space;
			const articLine = (noteY - baseY) / space + noteLine;
			const outerTopSpace = stave.getNumLines() - 0.5;
			return articLine > outerTopSpace ? articLine - outerTopSpace : 0;
		}
		if (this.position === Modifier.Position.ABOVE) {
			const baseY =
				getTopY(note, base) -
				(base + getInitialOffset(note, Modifier.Position.ABOVE)) * space;
			const articLine = (noteY - baseY) / space + noteLine;
			const outerBottomSpace = 1.5;
			return articLine < outerBottomSpace ? outerBottomSpace - articLine : 0;
		}
		return 0;
	}

	private matchesSide(sides: TieClearance, stemSide: number): boolean {
		switch (sides) {
			case 'none':
				return false;
			case 'both':
				return true;
			case 'above':
				return this.position === Modifier.Position.ABOVE;
			case 'below':
				return this.position === Modifier.Position.BELOW;
			case 'notehead':
				return this.position !== stemSide;
		}
	}
}
