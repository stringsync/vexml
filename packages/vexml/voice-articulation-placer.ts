import { Modifier, StaveNote, Stem, type Tickable } from 'vexflow/core';
import { NoteheadArticulation } from './notehead-articulation';
import { StaveArticulation } from './stave-articulation';
import { StaveOrnament } from './stave-ornament';
import { StringNumberAnnotation } from './string-number-annotation';

/*
 * Moves a notehead-side articulation to the stem side when another voice on the stave
 * strikes a note on the mark's side at the same moment, places an unplaced lower-voice
 * trill below the stave (Behind Bars p. 135), inverts a lower-voice default fermata
 * below the stave in double-stemmed writing (Behind Bars p. 189), and routes unplaced
 * lower-voice string designations, open-string marks, and left-hand pizzicato `+` signs
 * below the stave (Behind Bars pp. 394–395, 412).
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
			const hasOtherVoice = onsets.some(
				(other, index) => index !== voiceIndex && other.size > 0,
			);
			for (const [tick, note] of notes) {
				if (hasOtherVoice && note.getStemDirection() === Stem.DOWN) {
					for (const mod of note.getModifiers()) {
						if (
							mod instanceof StaveOrnament &&
							mod.isTrill &&
							!mod.explicitPlacement
						) {
							mod.setPosition(Modifier.Position.BELOW);
						} else if (mod instanceof StaveArticulation && mod.fermata) {
							mod.invertFermata();
						} else if (mod instanceof StaveArticulation) {
							mod.placeLowerVoiceBelow();
						} else if (mod instanceof StringNumberAnnotation) {
							mod.placeLowerVoiceBelow();
						}
					}
				}
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
