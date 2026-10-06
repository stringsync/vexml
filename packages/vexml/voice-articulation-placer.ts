import { StaveNote, type Tickable } from 'vexflow';
import { NoteheadArticulation } from './notehead-articulation';

/*
 * Moves a notehead-side articulation to the stem side when another voice on the stave
 * strikes a note on the mark's side at the same moment.
 *
 * With two voices on a stave the upper one stems up, so its accents and staccatos fall
 * below its noteheads, into the lower voice. A lower note struck on the same beat buries the
 * mark in its noteheads: the accent is drawn but can't be seen. Distance doesn't save it,
 * since vexflow pushes a notehead-side mark out past the stave lines, where the other voice's
 * notes sit. Past the stem tip it reads clearly. A mark whose other voice rests (or sits on
 * the stem side) stays where the single-voice rule puts it.
 */
export class VoiceArticulationPlacer {
	place(voices: ReadonlyArray<{ getTickables(): Tickable[] }>): void {
		if (voices.length < 2) {
			return;
		}
		const onsets = voices.map((voice) => this.onsets(voice.getTickables()));
		onsets.forEach((notes, voiceIndex) => {
			for (const [tick, note] of notes) {
				const marks = note
					.getModifiers()
					.filter((m) => m instanceof NoteheadArticulation);
				if (marks.length === 0) {
					continue;
				}
				const others = onsets
					.filter((_, other) => other !== voiceIndex)
					.map((other) => other.get(tick))
					.filter((other): other is StaveNote => other !== undefined);
				if (this.crowded(note, others)) {
					for (const mark of marks) {
						mark.setSide(note, 'stem');
					}
				}
			}
		});
	}

	/* Whether another voice's notehead sits on the note's notehead side. */
	private crowded(note: StaveNote, others: StaveNote[]): boolean {
		const lines = (n: StaveNote) => n.getKeyProps().map((p) => p.line);
		if (note.getStemDirection() === 1) {
			const bottom = Math.min(...lines(note));
			return others.some((o) => lines(o).some((line) => line < bottom));
		}
		const top = Math.max(...lines(note));
		return others.some((o) => lines(o).some((line) => line > top));
	}

	/* A voice's drawn, pitched notes by the tick they start on. */
	private onsets(tickables: Tickable[]): Map<number, StaveNote> {
		const out = new Map<number, StaveNote>();
		let tick = 0;
		for (const tickable of tickables) {
			if (
				tickable instanceof StaveNote &&
				!tickable.isRest() &&
				tickable.renderOptions.draw !== false
			) {
				out.set(tick, tickable);
			}
			tick += tickable.getTicks().value();
		}
		return out;
	}
}
