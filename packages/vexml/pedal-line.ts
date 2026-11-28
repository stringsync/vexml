import { Font, PedalMarking, type StaveNote } from 'vexflow/core';

// The SMuFL pedal glyphs (vexflow/core doesn't export its Glyphs table).
const GLYPHS = {
	ped: '\uE650',
	p: '\uE651',
	dot: '\uE654',
	up: '\uE655',
	sost: '\uE659',
	s: '\uE65A',
};

/** How a pedal span prints, read off its <pedal> markers. */
export type PedalStyle = {
	/** A bracket line under the span. */
	line: boolean;
	/** The "Ped." and "*" signs, alone or opening the line. */
	sign: boolean;
	/** "P." and "S." in place of "Ped." and "Sost. Ped.". */
	abbreviated: boolean;
	/** The sostenuto pedal rather than the sustain pedal. */
	sostenuto: boolean;
	/** The span picks up an earlier one (a resume): no down sign or hook. */
	resumed: boolean;
	/** The span confirms a continuing pedal at the start of a new system: "(Ped.)". */
	confirmed?: boolean;
	/** The span is dropped rather than released (a discontinue): no release sign or hook. */
	discontinued: boolean;
	/** Explicit right edge (e.g. system-end barline) when the line runs open across a break. */
	endX?: number;
};

// How far a re-pedal notch's sides reach either side of the note it changes on, and the
// gap between a "*" and the note after it.
const NOTCH = 5;
// Breathing room between confirmation parentheses and the pedal glyph.
const PAREN_GAP = 1.5;

/*
 * A pedal span: down under one note, re-pedaled at each change, up past the last. vexflow's
 * PedalMarking draws the plain sustain forms, but always opens with its sign or hook and
 * closes with its release, and has no abbreviated or sign-less line; this draws every form
 * MusicXML names. It stays a PedalMarking so the caller positions it with setLine.
 */
export class PedalLine extends PedalMarking {
	constructor(
		private readonly down: StaveNote,
		private readonly changes: readonly StaveNote[],
		private readonly up: StaveNote,
		private readonly pedal: PedalStyle,
	) {
		super([down, ...changes, up]);
	}

	override draw(): void {
		const ctx = this.checkContext();
		this.setRendered();
		if (this.renderOptions.color !== undefined) {
			ctx.setStrokeStyle(this.renderOptions.color);
			ctx.setFillStyle(this.renderOptions.color);
		}
		ctx.setFont(this.fontInfo);
		ctx.setLineWidth(this.renderOptions.bracketLineWidth);
		const y = this.down.checkStave().getYForBottomText(this.line + 3);
		if (this.pedal.line) {
			this.drawLine(y);
		} else if (this.pedal.sign) {
			this.drawSigns(y);
		}
	}

	private drawLine(y: number): void {
		const ctx = this.checkContext();
		const top = y - this.renderOptions.bracketHeight;
		let x = this.down.getAbsoluteX();
		ctx.beginPath();
		if (this.pedal.resumed) {
			ctx.moveTo(x, y);
		} else if (this.pedal.sign) {
			x += this.drawDepressSign(x, y) + this.renderOptions.textMarginRight;
			ctx.moveTo(x, y);
		} else {
			ctx.moveTo(x, top);
			ctx.lineTo(x, y);
		}
		for (const change of this.changes) {
			const cx = change.getAbsoluteX();
			ctx.lineTo(cx - NOTCH, y);
			ctx.lineTo(cx, top);
			ctx.lineTo(cx + NOTCH, y);
		}
		const end =
			this.pedal.endX !== undefined
				? Math.max(x, this.pedal.endX)
				: Math.max(x, this.liftX(this.up) - NOTCH);
		ctx.lineTo(end, y);
		if (!this.pedal.discontinued) {
			ctx.lineTo(end, top);
		}
		ctx.stroke();
	}

	private drawSigns(y: number): void {
		const ctx = this.checkContext();
		const depress = this.depressSign();
		const release = GLYPHS.up;
		const releaseWidth = ctx.measureText(release).width;
		if (!this.pedal.resumed) {
			this.drawDepressSign(this.down.getAbsoluteX(), y);
		}
		for (const change of this.changes) {
			const cx = change.getAbsoluteX();
			ctx.fillText(release, cx - releaseWidth - NOTCH, y);
			ctx.fillText(depress, cx, y);
		}
		if (!this.pedal.discontinued) {
			ctx.fillText(release, this.liftX(this.up) - releaseWidth, y);
		}
	}

	/* Draw the depress sign, wrapped in parentheses when confirming a continuing pedal on a new system. */
	private drawDepressSign(x: number, y: number): number {
		const ctx = this.checkContext();
		const depress = this.depressSign();
		if (!this.pedal.confirmed) {
			ctx.fillText(depress, x, y);
			return ctx.measureText(depress).width;
		}
		const basePx = Font.convertSizeToPixelValue(this.fontInfo.size);
		const parenFont = {
			family: 'Academico, serif',
			size: `${Math.round(basePx * 0.55)}px`,
			weight: 'normal',
			style: 'normal',
		};
		ctx.setFont(parenFont);
		ctx.fillText('(', x, y);
		const openW = ctx.measureText('(').width + PAREN_GAP;
		ctx.setFont(this.fontInfo);
		ctx.fillText(depress, x + openW, y);
		const glyphW = ctx.measureText(depress).width + PAREN_GAP;
		ctx.setFont(parenFont);
		ctx.fillText(')', x + openW + glyphW, y);
		const closeW = ctx.measureText(')').width;
		ctx.setFont(this.fontInfo);
		return openW + glyphW + closeW;
	}

	private depressSign(): string {
		const { sostenuto, abbreviated } = this.pedal;
		if (abbreviated) {
			return (sostenuto ? GLYPHS.s : GLYPHS.p) + GLYPHS.dot;
		}
		return sostenuto ? `${GLYPHS.sost} ${GLYPHS.ped}` : GLYPHS.ped;
	}

	/* The pedal lifts as the last held note ends: at the next note in its voice, or at the
	 * end of its stave when it is the last. */
	private liftX(note: StaveNote): number {
		const tickables = note.getVoice().getTickables();
		const next = tickables[tickables.indexOf(note) + 1] as
			| StaveNote
			| undefined;
		if (next) {
			return next.getAbsoluteX();
		}
		const stave = note.checkStave();
		return stave.getX() + stave.getWidth();
	}
}
