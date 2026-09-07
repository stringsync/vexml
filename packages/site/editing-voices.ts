import type { Note as MNote, Part as MPart } from '@stringsync/mdom';
import type { EditingMove, EditingSession } from '@stringsync/vexml';

/** Keeps the chosen voice through deselection and layout renders in the playground. */
export class EditingVoices {
	readonly options: readonly VoiceOption[];
	private active: string;

	constructor(readonly editor: EditingSession) {
		const parts = editor.document.score.parts;
		this.options = parts.flatMap((part, index) => {
			const voices = new Set(
				part.measures.flatMap((measure) =>
					measure.notes.map((note) => note.voice),
				),
			);
			return [...voices].map((voice) => ({
				value: JSON.stringify([index, voice]),
				label:
					parts.length > 1
						? `${part.label ?? part.id} (${part.id}) · Voice ${voice}`
						: `Voice ${voice}`,
				part,
				voice,
			}));
		});
		this.active = this.options[0]?.value ?? '';
	}

	getValue(): string {
		const focus = this.editor.getFocus();
		return (
			this.options.find(
				(option) => option.part === focus?.part && option.voice === focus.voice,
			)?.value ?? this.active
		);
	}

	select(value: string): boolean {
		const option = this.options.find((candidate) => candidate.value === value);
		if (!option) {
			return false;
		}
		const focus = this.editor.getFocus();
		const notes = this.notes(option);
		// Prefer the current measure, then the closest onset. Written order breaks ties.
		if (focus) {
			notes.sort(
				(a, b) =>
					Math.abs(a.measure.index - focus.measure.index) -
						Math.abs(b.measure.index - focus.measure.index) ||
					Math.abs((a.measureBeat ?? 0) - (focus.measureBeat ?? 0)) -
						Math.abs((b.measureBeat ?? 0) - (focus.measureBeat ?? 0)),
			);
		}
		const target = notes[0];
		if (!target) {
			return false;
		}
		this.active = value;
		this.editor.select(target);
		return true;
	}

	cycle(direction: 1 | -1): boolean {
		if (this.options.length < 2) {
			return false;
		}
		const at = this.options.findIndex(
			(option) => option.value === this.getValue(),
		);
		const next =
			this.options[
				(at + direction + this.options.length) % this.options.length
			];
		return next ? this.select(next.value) : false;
	}

	clear(): void {
		this.active = this.getValue();
		this.editor.selectNotes([]);
	}

	move(direction: EditingMove): boolean {
		if (
			!this.editor.getFocus() &&
			(direction === 'next' || direction === 'previous')
		) {
			const option = this.options.find(
				(candidate) => candidate.value === this.active,
			);
			const notes = option ? this.notes(option) : [];
			const target = direction === 'next' ? notes[0] : notes.at(-1);
			if (!target) {
				return false;
			}
			this.editor.select(target);
			return true;
		}
		return this.editor.move(direction);
	}

	private notes(option: VoiceOption): MNote[] {
		return option.part.measures.flatMap((measure) =>
			measure.chords
				.filter((chord) => chord.lead.voice === option.voice)
				.map((chord) => chord.lead),
		);
	}
}

interface VoiceOption {
	value: string;
	label: string;
	part: MPart;
	voice: string;
}
