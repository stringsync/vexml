import { PedalMarking, type StaveNote } from 'vexflow/core';

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
	/** The span is dropped rather than released (a discontinue): no release sign or hook. */
	discontinued: boolean;
};

// How far a re-pedal notch's sides reach either side of the note it changes on, and the
// gap between a "*" and the note after it.
const NOTCH = 5;

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
		ctx.setStrokeStyle(this.renderOptions.color);
		ctx.setFillStyle(this.renderOptions.color);
		ctx.setFont(this.font);
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
			const depress = this.depressSign();
			ctx.fillText(depress, x, y);
			x += ctx.measureText(depress).width + this.renderOptions.textMarginRight;
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
		const end = this.releaseX(this.up) - NOTCH;
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
			ctx.fillText(depress, this.down.getAbsoluteX(), y);
		}
		for (const change of this.changes) {
			const cx = change.getAbsoluteX();
			ctx.fillText(release, cx - releaseWidth - NOTCH, y);
			ctx.fillText(depress, cx, y);
		}
		if (!this.pedal.discontinued) {
			ctx.fillText(release, this.releaseX(this.up) - releaseWidth, y);
		}
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
	private releaseX(note: StaveNote): number {
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
