import type { Measure, Note } from '@stringsync/mdom';
import type { EditingKey, EditingSession } from '@stringsync/vexml';
import { Disposer, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful } from 'webappwiz/events';

/** Preview keyboard input without changing the score; Enter commits one mdom edit. */
export class NoteEntry implements Eventful<{ changed: undefined }>, Resource {
	private readonly disposer = new Disposer();
	private readonly dispatcher = this.disposer.use(
		new Dispatcher<{ changed: undefined }>(),
	);
	readonly events = this.dispatcher.events;
	draft: EntryDraft | null = null;
	duration: Parameters<Note['setDuration']>[0]['type'] = 'quarter';
	error: string | null = null;

	constructor(readonly editor: EditingSession) {
		this.disposer.defer(
			editor.events.on('selectionchange', () => this.cancel()),
		);
		this.disposer.defer(
			editor.events.on('documentchange', () => this.cancel()),
		);
	}

	begin(): void {
		if (this.draft) {
			return;
		}
		const note = this.editor.getFocus();
		const measure =
			note?.measure ?? this.editor.document.score.parts[0]?.measures[0];
		if (!measure) {
			return;
		}
		const staff = note?.staff ?? '1';
		if (
			note?.type &&
			[
				'whole',
				'half',
				'quarter',
				'eighth',
				'16th',
				'32nd',
				'64th',
				'128th',
			].includes(note.type)
		) {
			this.duration = note.type as Parameters<Note['setDuration']>[0]['type'];
		}
		const tab =
			measure.getClef(staff)?.sign === 'TAB' ||
			(measure.getStaffDetails(staff)?.staffLines != null &&
				measure.getStaffTunings(staff).length > 0);
		this.draft = {
			measure,
			staff,
			voice: note?.voice ?? '1',
			note,
			tab,
			step: note?.pitch?.step ?? 'B',
			octave: note?.pitch?.octave ?? 4,
			alter: note?.pitch?.alter ?? 0,
			string: note?.string ?? 1,
			fret: '',
		};
		this.error = null;
		this.changed();
	}

	handleKey(key: EditingKey): boolean {
		if (
			key.altKey ||
			key.ctrlKey ||
			key.metaKey ||
			(key.shiftKey && key.key.startsWith('Arrow'))
		) {
			return false;
		}
		if (key.key === 'Escape') {
			this.cancel();
			return true;
		}
		if (
			![
				'ArrowLeft',
				'ArrowRight',
				'ArrowUp',
				'ArrowDown',
				'Enter',
				'Backspace',
				'#',
				'b',
			].includes(key.key) &&
			!/^[a-gA-G0-9]$/.test(key.key)
		) {
			return false;
		}
		this.begin();
		const draft = this.draft;
		if (!draft) {
			return false;
		}
		this.error = null;
		if (key.key === 'Enter') {
			this.commit();
			return true;
		}
		if (key.key === 'ArrowLeft' || key.key === 'ArrowRight') {
			this.move(key.key === 'ArrowRight' ? 1 : -1);
		} else if (key.key === 'ArrowUp' || key.key === 'ArrowDown') {
			const direction = key.key === 'ArrowUp' ? 1 : -1;
			if (draft.tab) {
				draft.string = Math.max(
					1,
					Math.min(
						draft.measure.getStaffDetails(draft.staff)?.staffLines ?? 6,
						draft.string - direction,
					),
				);
				draft.fret = '';
			} else {
				const position = Math.max(
					0,
					Math.min(
						69,
						draft.octave * 7 + 'CDEFGAB'.indexOf(draft.step) + direction,
					),
				);
				draft.step = 'CDEFGAB'[position % 7] ?? 'C';
				draft.octave = Math.floor(position / 7);
			}
		} else if (draft.tab && /^\d$/.test(key.key)) {
			draft.fret = draft.fret.length >= 2 ? key.key : draft.fret + key.key;
		} else if (draft.tab && key.key === 'Backspace') {
			draft.fret = draft.fret.slice(0, -1);
		} else if (!draft.tab && key.key === '#') {
			draft.alter = draft.alter === 1 ? 0 : 1;
		} else if (!draft.tab && /^[a-gA-G]$/.test(key.key)) {
			draft.step = key.key.toUpperCase();
		}
		this.changed();
		return true;
	}

	setDuration(type: Parameters<Note['setDuration']>[0]['type']): void {
		this.duration = type;
		this.changed();
	}

	commit(): void {
		const draft = this.draft;
		if (!draft || (draft.tab && draft.fret === '')) {
			return;
		}
		try {
			if (draft.note?.ties.length || draft.note?.childrenNamed('tie').length) {
				throw new Error('Choose an untied note for pitch entry.');
			}
			const pitch = draft.tab
				? this.tabPitch(draft)
				: { step: draft.step, octave: draft.octave, alter: draft.alter };
			const note = this.editor.history.edit(
				draft.note ? 'Change note' : 'Add note',
				() => {
					let measure = draft.measure;
					const meter = measure.getTime(draft.staff);
					const capacity =
						(Number(meter?.beats ?? 4) * 4) / Number(meter?.beatType ?? 4);
					const end = Math.max(
						0,
						...measure.notes
							.filter((note) => note.voice === draft.voice)
							.map((note) => (note.measureBeat ?? 0) + (note.beats ?? 0)),
					);
					if (!draft.note && end >= capacity) {
						measure = measure.part.addMeasure();
					}
					const target =
						draft.note ??
						measure
							.getOrCreateVoice(draft.voice, { staff: draft.staff })
							.addNote({ ...pitch, type: this.duration });
					target.setPitch(pitch);
					if (draft.tab) {
						target.setStringFret({
							string: draft.string,
							fret: Number(draft.fret),
						});
					}
					target.child('accidental')?.remove();
					return target;
				},
			);
			this.editor.select(note);
			this.begin();
			this.move(1);
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
		}
		this.changed();
	}

	cancel(): void {
		this.draft = null;
		this.error = null;
		this.changed();
	}
	dispose(): void {
		this.disposer.dispose();
	}

	private move(direction: -1 | 1): void {
		const draft = this.draft;
		if (!draft) {
			return;
		}
		const notes = draft.measure.part.measures.flatMap((measure) =>
			measure.notes.filter(
				(note) =>
					note.voice === draft.voice &&
					note.staff === draft.staff &&
					!note.isGrace,
			),
		);
		const index = draft.note ? notes.indexOf(draft.note) : notes.length;
		const next = notes[index + direction];
		if (next) {
			this.editor.select(next);
			this.begin();
			return;
		}
		if (direction < 0) {
			return;
		}
		const last = notes.at(-1);
		let measure = last?.measure ?? draft.measure;
		const beats = measure.getTime(draft.staff);
		const capacity =
			(Number(beats?.beats ?? 4) * 4) / Number(beats?.beatType ?? 4);
		if (
			Math.max(
				0,
				...measure.notes.map(
					(note) => (note.measureBeat ?? 0) + (note.beats ?? 0),
				),
			) >= capacity
		) {
			// The next empty bar is created only with the committed note, not for a preview.
			const following = measure.part.measures[measure.index + 1];
			if (following) {
				measure = following;
			}
		}
		this.draft = { ...draft, measure, note: null, fret: '' };
		this.changed();
	}

	private tabPitch(draft: EntryDraft): Parameters<Note['setPitch']>[0] {
		const lines = draft.measure.getStaffDetails(draft.staff)?.staffLines ?? 6;
		const tuning = draft.measure
			.getStaffTunings(draft.staff)
			.find((tuning) => tuning.line === lines - draft.string + 1);
		if (!tuning) {
			throw new Error('This tablature needs a tuning for the selected string.');
		}
		const midi = tuning.midi + Number(draft.fret);
		const steps = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
		return {
			step: steps[midi % 12] ?? 'C',
			octave: Math.floor(midi / 12) - 1,
			alter: [1, 3, 6, 8, 10].includes(midi % 12) ? 1 : 0,
		};
	}
	private changed(): void {
		this.dispatcher.dispatch('changed');
	}
}

export interface EntryDraft {
	measure: Measure;
	staff: string;
	voice: string;
	note: Note | null;
	tab: boolean;
	step: string;
	octave: number;
	alter: number;
	string: number;
	fret: string;
}
