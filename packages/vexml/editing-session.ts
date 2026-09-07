import {
	type MDocument,
	Note as MNote,
	type Part as MPart,
} from '@stringsync/mdom';
import { Dispatcher, type Eventful } from 'webappwiz/events';
import { EditingNavigator } from './editing-navigator';
import type { Element } from './element';
import type { ElementIndex } from './element-index';
import type { Note } from './note';
import { PitchEdit, type PitchInput } from './pitch-edit';

export interface SelectionOptions {
	/** Extend from the fixed anchor within its part and voice. */
	extend?: boolean;
}

export type EditingMove = 'next' | 'previous' | 'higher' | 'lower';

export interface EditingVoice {
	readonly part: MPart;
	readonly voice: string;
}

export type EditingSessionEvents = {
	selectionchange: undefined;
	voicechange: undefined;
	documentchange: undefined;
};

/** A note-editing session outlives rendered Scores. Optional EditingControllers own
 * input and overlays; the host schedules rerenders. This object owns document state.
 * Structural edits outside the session require clearHistory(); detached targets are pruned. */
export class EditingSession implements Eventful<EditingSessionEvents> {
	private readonly dispatcher = new Dispatcher<EditingSessionEvents>();
	readonly events = this.dispatcher.events;
	private activeVoice: EditingVoice | null = null;
	private focus: MNote | null = null;
	private anchor: MNote | null = null;
	private selected: MNote[] = [];
	private readonly past: PitchEdit[] = [];
	private readonly future: PitchEdit[] = [];

	constructor(readonly document: MDocument) {}

	/** Voices in first-written order, deduplicated across measures and staves. */
	getVoices(): readonly EditingVoice[] {
		return this.document.score.parts.flatMap((part) =>
			[
				...new Set(
					part.measures.flatMap((measure) =>
						measure.notes.map((note) => note.voice),
					),
				),
			].map((voice) => ({ part, voice })),
		);
	}

	getActiveVoice(): EditingVoice | null {
		const voices = this.getVoices();
		return (
			voices.find(
				(voice) =>
					voice.part === this.activeVoice?.part &&
					voice.voice === this.activeVoice.voice,
			) ??
			voices[0] ??
			null
		);
	}

	/** Changes navigation context without moving focus or altering selection. */
	setActiveVoice(voice: EditingVoice): void {
		const target = this.getVoices().find(
			(candidate) =>
				candidate.part === voice.part && candidate.voice === voice.voice,
		);
		if (!target) {
			throw new Error('editing: voice does not belong to this document');
		}
		const previous = this.getActiveVoice();
		this.activeVoice = target;
		if (previous?.part !== target.part || previous.voice !== target.voice) {
			this.dispatcher.dispatch('voicechange');
		}
	}

	clearSelection(): void {
		this.selectNotes([]);
	}

	/** Whether a gesture can extend the existing range without crossing voices. */
	canExtendTo(note: MNote): boolean {
		const anchor = this.anchor;
		return (
			!anchor ||
			!this.contains(anchor) ||
			(anchor.part === note.part && anchor.voice === note.voice)
		);
	}

	private selectionChanged(): void {
		const focus = this.getFocus();
		if (focus) {
			this.setActiveVoice({ part: focus.part, voice: focus.voice });
		}
		this.dispatcher.dispatch('selectionchange');
	}

	getFocus(): MNote | null {
		return this.focus && this.contains(this.focus) ? this.focus : null;
	}

	getSelection(): readonly MNote[] {
		return this.selected.filter((note) => this.contains(note));
	}

	/** Selecting a note starts a selection; extend: true extends the existing voice range.
	 * Chord members, grace notes and invisible notes remain individual targets. */
	select(note: MNote, options: SelectionOptions = {}): void {
		this.requireNote(note);
		const anchor = this.anchor;
		if (options.extend && anchor && this.contains(anchor)) {
			if (anchor.part !== note.part || anchor.voice !== note.voice) {
				throw new Error('editing: a range must stay within one part and voice');
			}
			const notes = this.voiceNotes(anchor);
			const start = notes.indexOf(anchor);
			const end = notes.indexOf(note);
			this.selected = notes.slice(
				Math.min(start, end),
				Math.max(start, end) + 1,
			);
		} else {
			this.anchor = note;
			this.selected = [note];
		}
		this.focus = note;
		this.selectionChanged();
	}

	/** Explicit sets may cross parts/voices. The final supplied note becomes focus and anchor. */
	selectNotes(notes: readonly MNote[]): void {
		for (const note of notes) {
			this.requireNote(note);
		}
		this.selected = [...new Set(notes)];
		this.focus = this.selected.at(-1) ?? null;
		this.anchor = this.focus;
		this.selectionChanged();
	}

	toggle(note: MNote): void {
		this.requireNote(note);
		const selected = this.getSelection();
		this.selectNotes(
			selected.includes(note)
				? selected.filter((target) => target !== note)
				: [...selected, note],
		);
	}

	/** Bridge point/marquee hits to document targets. Background boxes are ignored;
	 * a notehead and its tab fret collapse to one note. */
	selectElements(elements: readonly Element[]): void {
		this.selectNotes(
			elements.flatMap((element) =>
				element
					.getSources()
					.filter((source): source is MNote => source instanceof MNote),
			),
		);
	}

	/** Resolve against the CURRENT render after editing, resizing or changing layout. */
	getSelectedElements(index: ElementIndex): readonly Note[] {
		return this.getSelection().flatMap((note) => {
			const element = index.noteLookup.get(note);
			return element ? [element] : [];
		});
	}

	/** Left/right follow the written voice across measures, including cross-staff notes, landing on chord leads.
	 * Up/down visit pitches within the current chord. Boundaries clamp. */
	move(direction: EditingMove, options: SelectionOptions = {}): boolean {
		return new EditingNavigator(this).move(
			{
				unit:
					direction === 'next' || direction === 'previous'
						? 'note'
						: 'chordPitch',
				direction: direction === 'next' || direction === 'higher' ? 1 : -1,
			},
			options,
		);
	}

	/** One group edit is one undo step. Returns false for an empty or unchanged selection. */
	setPitch(spec: PitchInput): boolean {
		const edit = PitchEdit.apply(this.getSelection(), spec);
		if (!edit.changed) {
			return false;
		}
		this.past.push(edit);
		this.future.length = 0;
		this.dispatcher.dispatch('documentchange');
		return true;
	}

	undo(): boolean {
		const edit = this.past.at(-1);
		if (!edit) {
			return false;
		}
		edit.undo();
		this.past.pop();
		this.future.push(edit);
		this.dispatcher.dispatch('documentchange');
		return true;
	}

	redo(): boolean {
		const edit = this.future.at(-1);
		if (!edit) {
			return false;
		}
		edit.redo();
		this.future.pop();
		this.past.push(edit);
		this.dispatcher.dispatch('documentchange');
		return true;
	}

	clearHistory(): void {
		this.past.length = 0;
		this.future.length = 0;
	}

	private contains(note: MNote): boolean {
		let node = note.parent;
		while (node) {
			if (node === this.document.root) {
				return true;
			}
			node = node.parent;
		}
		return false;
	}

	private requireNote(note: MNote): void {
		if (!this.contains(note)) {
			throw new Error('editing: target does not belong to this document');
		}
	}

	private voiceNotes(note: MNote): MNote[] {
		return note.part.measures.flatMap((measure) =>
			measure.notes.filter((candidate) => candidate.voice === note.voice),
		);
	}
}
