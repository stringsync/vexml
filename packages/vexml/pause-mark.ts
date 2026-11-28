import { BoundingBox, Modifier, type Stave } from 'vexflow/core';

export type PauseMarkKind = 'breath-mark' | 'breath-tick' | 'caesura';
export type PauseMarkPlacement = 'above' | 'below';

const GLYPHS: Record<PauseMarkKind, string> = {
	'breath-mark': '\uE4CE', // SMuFL breathMarkComma
	'breath-tick': '\uE4CF', // SMuFL breathMarkTick
	caesura: '\uE4D1', // SMuFL caesura
};

// Bravura glyph dimensions in stave-spaces (1 em = 4 spaces).
const WIDTH_SPACES: Record<PauseMarkKind, number> = {
	'breath-mark': 0.61,
	'breath-tick': 0.8,
	caesura: 1.54,
};

const HEIGHT_SPACES: Record<PauseMarkKind, number> = {
	'breath-mark': 1.0,
	'breath-tick': 1.0,
	caesura: 2.13,
};

/*
 * A breath comma (<breath-mark/>) or caesura (<caesura/>) marking a break in sound after
 * its host note. Behind Bars p. 187 places both just before the next note or barline rather
 * than centred over the host notehead, with the caesura's diagonal strokes starting on the
 * second stave-line down and extending upwards to the first ledger line above the stave.
 *
 * Kept outside VexFlow's Articulation category so ModifierContext does not stack host-note
 * articulations or fermatas on top of it, and SystemFormatter places its horizontal coordinate
 * once note and barline positions are final.
 */
export class PauseMark extends Modifier {
	static override get CATEGORY(): string {
		return 'PauseMark';
	}

	private drawX: number | null = null;

	constructor(
		readonly kind: PauseMarkKind,
		readonly placement: PauseMarkPlacement = 'above',
	) {
		super();
		this.setPosition(
			placement === 'below' ? Modifier.Position.BELOW : Modifier.Position.ABOVE,
		);
		this.setWidth(0);
	}

	override getCategory(): string {
		return PauseMark.CATEGORY;
	}

	/** Width of the mark in stave-spaces. */
	widthSpaces(): number {
		return WIDTH_SPACES[this.kind];
	}

	/** Set the left-edge x coordinate where draw() paints the glyph. */
	setDrawX(x: number): void {
		this.drawX = x;
	}

	/** Baseline y coordinate for the glyph on `stave`. */
	baselineY(stave: Stave): number {
		const space = stave.getSpacingBetweenLines();
		const top = stave.getYForLine(0);
		const bottom = stave.getYForLine(stave.getNumLines() - 1);
		if (this.kind === 'caesura') {
			return this.placement === 'below' ? bottom + space : stave.getYForLine(1);
		}
		return this.placement === 'below'
			? bottom + 1.25 * space
			: top - 0.25 * space;
	}

	override getBoundingBox(): BoundingBox {
		const note = this.checkAttachedNote();
		const stave = note.checkStave();
		const space = stave.getSpacingBetweenLines();
		const x = this.drawX ?? note.getAbsoluteX() + note.getGlyphWidth();
		const y = this.baselineY(stave);
		const w = WIDTH_SPACES[this.kind] * space;
		const h = HEIGHT_SPACES[this.kind] * space;
		return new BoundingBox(x, y - h, w, h);
	}

	override draw(): void {
		const ctx = this.checkContext();
		const note = this.checkAttachedNote();
		const stave = note.checkStave();
		const space = stave.getSpacingBetweenLines();
		const x = this.drawX ?? note.getAbsoluteX() + note.getGlyphWidth();
		const y = this.baselineY(stave);
		// Bravura at 30pt = 40px = 4 stave-spaces at the default 10px line spacing.
		const fontSizePt = 30 * (space / 10);
		this.setRendered();
		ctx.save();
		ctx.setFont('Bravura', fontSizePt, 'normal', 'normal');
		ctx.fillText(GLYPHS[this.kind], x, y);
		ctx.restore();
	}
}
