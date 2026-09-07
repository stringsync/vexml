import { MusicXMLSerializer } from '@stringsync/mdom';
import type { EditingSession, PitchInput } from '@stringsync/vexml';
import { Disposer, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful } from 'webappwiz/events';

/** Edit selected notes' pitch and staccato markings through the demo's form. */
export class NoteEditing implements Eventful<{ changed: undefined }>, Resource {
	private readonly dispatcher = new Dispatcher<{ changed: undefined }>();
	readonly events = this.dispatcher.events;
	private readonly disposer = new Disposer();
	step = '';
	alter = '';
	octave = '';
	error: string | null = null;

	constructor(readonly editor: EditingSession) {
		this.disposer.use(this.dispatcher);
		this.disposer.defer(
			editor.events.on('selectionchange', () => this.refresh()),
		);
		this.disposer.defer(
			editor.events.on('documentchange', () => this.refresh()),
		);
		this.refresh();
	}

	get pitchReason(): string | null {
		const notes = this.editor.getSelection();
		if (!notes.length) {
			return 'Select a pitched note to change its pitch.';
		}
		if (notes.some((note) => !note.pitch)) {
			return 'Pitch editing requires ordinary pitched notes.';
		}
		if (
			notes.some((note) => note.ties.length || note.childrenNamed('tie').length)
		) {
			return 'Tied notes need a tie-aware pitch edit.';
		}
		if (notes.some((note) => note.string !== null || note.fret !== null)) {
			return 'Fretted notes need a fingering-aware pitch edit.';
		}
		return null;
	}

	get canApplyPitch(): boolean {
		return (
			!this.pitchReason &&
			this.step !== '' &&
			this.alter !== '' &&
			this.octave !== ''
		);
	}

	get staccato(): boolean | 'indeterminate' {
		const notes = this.editor.getSelection();
		const marked = notes.filter((note) =>
			note.articulations.includes('staccato'),
		).length;
		return marked > 0 && marked < notes.length ? 'indeterminate' : marked > 0;
	}

	setPitchField(field: 'step' | 'alter' | 'octave', value: string): void {
		this[field] = value;
		this.error = null;
		this.dispatcher.dispatch('changed');
	}

	applyPitch(): void {
		if (!this.canApplyPitch) {
			return;
		}
		const pitch: PitchInput = {
			step: this.step,
			alter: Number(this.alter),
			octave: Number(this.octave),
		};
		try {
			this.error = null;
			this.editor.setPitch(pitch);
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
		}
		this.dispatcher.dispatch('changed');
	}

	toggleStaccato(): void {
		const notes = this.editor.getSelection();
		const remove = this.staccato === true;
		this.editor.history.edit(
			remove ? 'Remove staccato' : 'Add staccato',
			() => {
				for (const note of notes) {
					if (remove) {
						for (const notations of note.childrenNamed('notations')) {
							for (const block of notations.childrenNamed('articulations')) {
								for (const mark of block.childrenNamed('staccato')) {
									mark.remove();
								}
								if (!block.children.length) {
									block.remove();
								}
							}
							if (!notations.children.length) {
								notations.remove();
							}
						}
					} else if (!note.articulations.includes('staccato')) {
						note.addArticulation('staccato');
					}
				}
			},
		);
	}

	serialize(): string {
		return new MusicXMLSerializer().serializeToString(this.editor.document);
	}

	dispose(): void {
		this.disposer.dispose();
	}

	private refresh(): void {
		const pitches = this.editor.getSelection().map((note) => note.pitch);
		const first = pitches[0];
		this.step =
			first && pitches.every((pitch) => pitch?.step === first.step)
				? first.step
				: '';
		this.alter =
			first && pitches.every((pitch) => pitch?.alter === first.alter)
				? String(first.alter)
				: '';
		this.octave =
			first && pitches.every((pitch) => pitch?.octave === first.octave)
				? String(first.octave)
				: '';
		this.error = null;
		this.dispatcher.dispatch('changed');
	}
}
