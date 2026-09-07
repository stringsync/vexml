import type { Measure, Note } from '@stringsync/mdom';
import type { EditingLayout } from './editing-layout';
import type {
	EditingSession,
	EditingVoice,
	SelectionOptions,
} from './editing-session';

export interface EditingNavigation {
	unit: 'note' | 'measure' | 'voice' | 'chordPitch';
	direction: -1 | 1;
}

/** Resolves musical targets, independent of keys, pixels, playback and mutation history. */
export class EditingNavigator {
	constructor(
		private readonly editor: EditingSession,
		private readonly layout?: EditingLayout,
	) {}

	move(move: EditingNavigation, options: SelectionOptions = {}): boolean {
		const focus = this.editor.getFocus();
		let target: Note | undefined;
		switch (move.unit) {
			case 'note':
				target = this.nextNote(move.direction);
				break;
			case 'measure':
				target = focus
					? this.nextMeasure(focus, move.direction)
					: this.nextNote(move.direction);
				break;
			case 'voice':
				target = focus ? this.nextVoice(focus, move.direction) : undefined;
				break;
			case 'chordPitch':
				target = focus ? this.nextPitch(focus, move.direction) : undefined;
				break;
		}
		if (
			!target ||
			target === focus ||
			(options.extend && !this.editor.canExtendTo(target))
		) {
			return false;
		}
		this.editor.select(target, options);
		return true;
	}

	selectVoice(voice: EditingVoice): boolean {
		const available = this.editor
			.getVoices()
			.find(
				(candidate) =>
					candidate.part === voice.part && candidate.voice === voice.voice,
			);
		if (!available) {
			return false;
		}
		const notes = this.notes(available);
		const target = this.closest(notes, this.editor.getFocus());
		if (!target) {
			return false;
		}
		this.editor.select(target);
		return true;
	}

	private notes(voice: EditingVoice, measures = voice.part.measures): Note[] {
		return measures.flatMap((measure) =>
			measure.chords
				.filter(
					(chord) =>
						chord.lead.part === voice.part && chord.lead.voice === voice.voice,
				)
				.map((chord) => chord.lead),
		);
	}

	private nextNote(direction: -1 | 1): Note | undefined {
		const focus = this.editor.getFocus();
		const voice = focus
			? { part: focus.part, voice: focus.voice }
			: this.editor.getActiveVoice();
		if (!voice) {
			return undefined;
		}
		const chords = voice.part.measures.flatMap((measure) =>
			measure.chords.filter((chord) => chord.lead.voice === voice.voice),
		);
		if (!focus) {
			return (direction === 1 ? chords[0] : chords.at(-1))?.lead;
		}
		const at = chords.findIndex((chord) => chord.notes.includes(focus));
		return chords[at + direction]?.lead;
	}

	private nextMeasure(focus: Note, direction: -1 | 1): Note | undefined {
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
				return target;
			}
		}
		return undefined;
	}

	private nextVoice(focus: Note, direction: -1 | 1): Note | undefined {
		const systems = this.layout?.getSystems();
		if (!systems) {
			const voices = this.editor.getVoices();
			const at = voices.findIndex(
				(voice) => voice.part === focus.part && voice.voice === focus.voice,
			);
			const voice = voices[at + direction];
			return voice ? this.closest(this.notes(voice), focus) : undefined;
		}
		const index = systems.findIndex((measures) =>
			measures.includes(focus.measure),
		);
		const system = systems[index];
		if (!system) {
			return undefined;
		}
		const groups = this.groups(system);
		const at = groups.findIndex((notes) =>
			notes.some(
				(note) => note.part === focus.part && note.voice === focus.voice,
			),
		);
		const adjacent = groups[at + direction];
		if (adjacent) {
			return this.closest(adjacent, focus);
		}
		for (
			let next = index + direction;
			next >= 0 && next < systems.length;
			next += direction
		) {
			const measures = systems[next];
			if (!measures) {
				continue;
			}
			const nextGroups = this.groups(measures);
			const target =
				direction === 1 ? nextGroups[0]?.[0] : nextGroups.at(-1)?.at(-1);
			if (target) {
				return target;
			}
		}
		return undefined;
	}

	private groups(measures: readonly Measure[]): Note[][] {
		return this.editor
			.getVoices()
			.map((voice) => this.notes(voice, [...measures]))
			.filter((notes) => notes.length > 0);
	}

	private closest(
		notes: readonly Note[],
		focus: Note | null,
	): Note | undefined {
		if (!focus) {
			return notes[0];
		}
		return [...notes].sort(
			(a, b) =>
				Math.abs(a.measure.index - focus.measure.index) -
					Math.abs(b.measure.index - focus.measure.index) ||
				Math.abs((a.measureBeat ?? 0) - (focus.measureBeat ?? 0)) -
					Math.abs((b.measureBeat ?? 0) - (focus.measureBeat ?? 0)),
		)[0];
	}

	private nextPitch(focus: Note, direction: -1 | 1): Note | undefined {
		const chord = focus.measure.chords.find((chord) =>
			chord.notes.includes(focus),
		);
		const notes = (chord?.notes ?? [])
			.filter((note) => note.pitch !== null)
			.sort((a, b) => this.pitchNumber(a) - this.pitchNumber(b));
		const at = notes.indexOf(focus);
		return at < 0 ? undefined : notes[at + direction];
	}

	private pitchNumber(note: Note): number {
		const pitch = note.pitch;
		const semitones: Record<string, number> = {
			C: 0,
			D: 2,
			E: 4,
			F: 5,
			G: 7,
			A: 9,
			B: 11,
		};
		return pitch
			? pitch.octave * 12 + (semitones[pitch.step] ?? 0) + pitch.alter
			: 0;
	}
}
