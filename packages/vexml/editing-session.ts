import { type MDocument, Note as MNote } from '@stringsync/mdom';
import type { Element } from './element';
import type { ElementIndex } from './element-index';
import type { Note } from './note';
import { PitchEdit, type PitchInput } from './pitch-edit';

export interface SelectionOptions {
	/** Extend from the fixed anchor within its part and voice. */
	extend?: boolean;
}

export type EditingMove = 'next' | 'previous' | 'higher' | 'lower';

/** A note-editing session outlives rendered Scores. The caller owns keyboard bindings,
 * redraw scheduling and overlays; this object owns document focus, selection and history.
 * Structural edits outside the session require clearHistory(); detached targets are pruned. */
export class EditingSession {
	private focus: MNote | null = null;
	private anchor: MNote | null = null;
	private selected: MNote[] = [];
	private readonly past: PitchEdit[] = [];
	private readonly future: PitchEdit[] = [];

	constructor(readonly document: MDocument) {}

	getFocus(): MNote | null {
		return this.focus && this.contains(this.focus) ? this.focus : null;
	}

	getSelection(): readonly MNote[] {
		return this.selected.filter((note) => this.contains(note));
	}

	/** Clicking a note starts a selection; Shift-click extends the existing voice range.
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
	}

	/** Explicit sets may cross parts/voices. The final supplied note becomes focus and anchor. */
	selectNotes(notes: readonly MNote[]): void {
		for (const note of notes) {
			this.requireNote(note);
		}
		this.selected = [...new Set(notes)];
		this.focus = this.selected.at(-1) ?? null;
		this.anchor = this.focus;
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
		const focus = this.getFocus();
		let target: MNote | undefined;
		if (!focus) {
			if (direction === 'higher' || direction === 'lower') {
				return false;
			}
			const notes = this.document.score.parts.flatMap((part) =>
				part.measures.flatMap((measure) =>
					measure.chords.map((chord) => chord.lead),
				),
			);
			target = direction === 'next' ? notes[0] : notes.at(-1);
		} else if (direction === 'next' || direction === 'previous') {
			const chords = focus.part.measures.flatMap((measure) =>
				measure.chords.filter((chord) => chord.lead.voice === focus.voice),
			);
			const at = chords.findIndex((chord) => chord.notes.includes(focus));
			target = chords[at + (direction === 'next' ? 1 : -1)]?.lead;
		} else {
			const chord = focus.measure.chords.find((chord) =>
				chord.notes.includes(focus),
			);
			const notes = (chord?.notes ?? [])
				.filter((note) => note.pitch !== null)
				.sort((a, b) => this.pitchNumber(a) - this.pitchNumber(b));
			const at = notes.indexOf(focus);
			if (at >= 0) {
				target = notes[at + (direction === 'higher' ? 1 : -1)];
			}
		}
		if (!target) {
			return false;
		}
		this.select(target, options);
		return true;
	}

	/** One group edit is one undo step. Returns false for an empty or unchanged selection. */
	setPitch(spec: PitchInput): boolean {
		const edit = PitchEdit.apply(this.getSelection(), spec);
		if (!edit.changed) {
			return false;
		}
		this.past.push(edit);
		this.future.length = 0;
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

	private pitchNumber(note: MNote): number {
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
