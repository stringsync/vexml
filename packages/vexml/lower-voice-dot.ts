import { Dot, type StaveNote } from 'vexflow/core';

/**
 * A lower voice's dot on a line note uses the space below its head (Behind Bars
 * p. 56), whatever the upper voice is doing at the time. VexFlow picks a dot row
 * only from the dotted heads formatted together, so it would put the dot above
 * whenever the upper voice rests or sustains. The row is applied at draw time,
 * after the formatter has run, so formatting order cannot undo it.
 */
export class LowerVoiceDot extends Dot {
	private below = true;

	/** Attach one dot per head, pinning line-note dots below when no heads are a second apart. */
	static attach(note: StaveNote, count: number): void {
		const lines = note
			.getKeyProps()
			.map(({ line }) => line)
			.sort((a, b) => a - b);
		// Seconds share their dot rows with the neighbouring head: leave those to VexFlow.
		const second = lines.some((line, i) => line - (lines[i - 1] ?? -99) <= 0.5);
		for (let dot = 0; dot < count; dot++) {
			for (const [index, { line }] of note.getKeyProps().entries()) {
				const modifier = new LowerVoiceDot();
				modifier.below = !second && Number.isInteger(line);
				note.addModifier(modifier, index);
			}
		}
	}

	/** Release the note's dots to VexFlow's own row, as crossed voices need. */
	static release(note: StaveNote): void {
		for (const dot of Dot.getDots(note)) {
			if (dot instanceof LowerVoiceDot) {
				dot.below = false;
			}
		}
	}

	override getInkBounds() {
		this.pin();
		return super.getInkBounds();
	}

	override draw(): void {
		this.pin();
		super.draw();
	}

	private pin(): void {
		if (this.below) {
			this.dotShiftY = 0.5;
		}
	}
}
