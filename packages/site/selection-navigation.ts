import type { Measure, Note } from '@stringsync/mdom';
import type { EditingVoices } from './editing-voices';

/** System boundaries belong to the current layout; selection belongs to the document. */
export class SelectionNavigation {
	constructor(
		private readonly voices: EditingVoices,
		private readonly systems: readonly (readonly Measure[])[],
	) {}

	note(direction: 1 | -1): boolean {
		return this.voices.move(direction === 1 ? 'next' : 'previous');
	}

	measure(direction: 1 | -1): boolean {
		const focus = this.voices.editor.getFocus();
		if (!focus) {
			return this.note(direction);
		}
		const measures = focus.part.measures;
		for (
			let index = focus.measure.index + direction;
			index >= 0 && index < measures.length;
			index += direction
		) {
			const target = measures[index]?.chords.find(
				(chord) => chord.lead.voice === focus.voice,
			)?.lead;
			if (target) {
				this.voices.editor.select(target);
				return true;
			}
		}
		return false;
	}

	voice(direction: 1 | -1): boolean {
		const focus = this.voices.editor.getFocus();
		if (!focus) {
			return false;
		}
		const index = this.systems.findIndex((measures) =>
			measures.includes(focus.measure),
		);
		const system = this.systems[index];
		if (!system) {
			return false;
		}
		const groups = this.groups(system);
		const at = groups.findIndex((notes) =>
			notes.some(
				(note) => note.part === focus.part && note.voice === focus.voice,
			),
		);
		const adjacent = groups[at + direction];
		if (adjacent) {
			const target = [...adjacent].sort(
				(a, b) =>
					Math.abs(a.measure.index - focus.measure.index) -
						Math.abs(b.measure.index - focus.measure.index) ||
					Math.abs((a.measureBeat ?? 0) - (focus.measureBeat ?? 0)) -
						Math.abs((b.measureBeat ?? 0) - (focus.measureBeat ?? 0)),
			)[0];
			if (!target) {
				return false;
			}
			this.voices.editor.select(target);
			return true;
		}
		const next = this.systems[index + direction];
		if (!next) {
			return false;
		}
		const nextGroups = this.groups(next);
		const target =
			direction === 1 ? nextGroups[0]?.[0] : nextGroups.at(-1)?.at(-1);
		if (!target) {
			return false;
		}
		this.voices.editor.select(target);
		return true;
	}

	private groups(measures: readonly Measure[]): Note[][] {
		return this.voices.options
			.map((option) =>
				measures.flatMap((measure) =>
					measure.chords
						.filter(
							(chord) =>
								chord.lead.part === option.part &&
								chord.lead.voice === option.voice,
						)
						.map((chord) => chord.lead),
				),
			)
			.filter((notes) => notes.length > 0);
	}
}
