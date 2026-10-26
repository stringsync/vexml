import { Modifier, type StaveNote } from 'vexflow/core';

const FONT_FAMILY = 'Arial, sans-serif';
const FONT_SIZE = 9;
const HOLLOW_DURATIONS = new Set(['w', 'h']);

/*
 * A <notehead-text> label (its <display-text> and <accidental-text> runs, joined) centered in
 * its notehead, as shape-note and named-pitch scores print. It claims no width: the text
 * rides inside the head, so it moves nothing around it.
 */
export class NoteheadText extends Modifier {
	static override get CATEGORY(): string {
		return 'NoteheadText';
	}

	constructor(private readonly label: string) {
		super();
		this.setPosition(Modifier.Position.CENTER);
		this.setWidth(0);
	}

	override getCategory(): string {
		return NoteheadText.CATEGORY;
	}

	override draw(): void {
		const ctx = this.checkContext();
		const note = this.checkAttachedNote() as StaveNote;
		this.setRendered();
		const left = note.getModifierStartXY(
			Modifier.Position.LEFT,
			this.checkIndex(),
		);
		const right = note.getModifierStartXY(
			Modifier.Position.RIGHT,
			this.checkIndex(),
		);
		const x = (left.x + right.x) / 2;
		ctx.save();
		// A filled head (quarter and shorter) is dark, so its label prints light.
		if (!HOLLOW_DURATIONS.has(note.getDuration())) {
			ctx.setFillStyle('#fff');
		}
		ctx.setFont(FONT_FAMILY, FONT_SIZE);
		const width = ctx.measureText(this.label).width;
		ctx.fillText(this.label, x - width / 2, left.y + FONT_SIZE * 0.35);
		ctx.restore();
	}
}
