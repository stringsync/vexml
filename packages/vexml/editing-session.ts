import {
	type Barline as MBarline,
	type MDocument,
	type MElement,
	type Measure as MMeasure,
	Note as MNote,
	type Part as MPart,
} from '@stringsync/mdom';
import { Disposer, type Resource } from 'core/disposable';
import { Dispatcher, type Eventful } from 'core/events';
import type { EditingCaret } from './editing-caret';
import { EditingNavigator } from './editing-navigator';
import type { Element } from './element';
import type { ElementIndex } from './element-index';
import type { Note } from './note';
import { PitchEdit, type PitchInput } from './pitch-edit';
import { TabPositionEdit, type TabPositionInput } from './tab-position-edit';

export interface SelectionOptions {
	/** Extend from the fixed anchor within the selection's part and scope. */
	extend?: boolean;
}

export type EditingMove = 'next' | 'previous' | 'higher' | 'lower';

export interface EditingVoice {
	readonly part: MPart;
	readonly voice: string;
}

export type BarlineLocation = 'left' | 'right' | 'middle';

export interface EditingBarline {
	readonly measure: MMeasure;
	readonly location: BarlineLocation;
	readonly barline: MBarline | null;
}

export type EditingStructuralTarget = MMeasure | EditingBarline;

export type EditingSessionEvents = {
	selectionchange: undefined;
	caretchange: undefined;
	voicechange: undefined;
	documentchange: undefined;
};

/** Select notes, measures and barlines on an mdom document and run undoable edits. */
export class EditingSession
	implements Eventful<EditingSessionEvents>, Resource
{
	private readonly disposer = new Disposer();
	private readonly dispatcher = this.disposer.use(
		new Dispatcher<EditingSessionEvents>(),
	);
	readonly events = this.dispatcher.events;
	private activeVoice: EditingVoice | null = null;
	private focus: MNote | null = null;
	private anchor: MNote | null = null;
	private selected: MNote[] = [];
	private structuralFocus: EditingStructuralTarget | null = null;
	private structuralAnchor: EditingStructuralTarget | null = null;
	private selectedMeasures: MMeasure[] = [];
	private selectedBarline: EditingBarline | null = null;
	private caret: EditingCaret | null = null;

	constructor(readonly document: MDocument) {
		this.disposer.defer(
			document.history.events.on('change', () => {
				this.dispatcher.dispatch('documentchange');
			}),
		);
	}

	/** The document's native mdom history. Use edit() for any supported mutation. */
	get history() {
		return this.document.history;
	}

	/** Release this session's listeners. The caller retains ownership of document history. */
	dispose(): void {
		this.disposer.dispose();
	}

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

	getCaret(): EditingCaret | null {
		return this.caret && this.contains(this.caret.measure)
			? { ...this.caret }
			: null;
	}

	/** Move the insertion target without editing the document or creating history. */
	setCaret(caret: EditingCaret): void {
		this.requireCaret(caret);
		const hadSelection = Boolean(
			this.focus ||
				this.anchor ||
				this.selected.length ||
				this.structuralFocus ||
				this.structuralAnchor ||
				this.selectedMeasures.length ||
				this.selectedBarline,
		);
		this.clearNoteSelection();
		this.clearStructuralSelection();
		this.caret = { ...caret };
		if (hadSelection) {
			this.selectionChanged();
		}
		this.dispatcher.dispatch('caretchange');
	}

	moveCaret(onset: number): boolean {
		const caret = this.getCaret();
		if (!caret) {
			return false;
		}
		this.setCaret({ ...caret, onset });
		return true;
	}

	clearCaret(): void {
		if (this.caret) {
			this.caret = null;
			this.dispatcher.dispatch('caretchange');
		}
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

	getStructuralFocus(): EditingStructuralTarget | null {
		return this.structuralFocus &&
			this.containsStructuralTarget(this.structuralFocus)
			? this.structuralFocus
			: null;
	}

	getStructuralAnchor(): EditingStructuralTarget | null {
		return this.structuralAnchor &&
			this.containsStructuralTarget(this.structuralAnchor)
			? this.structuralAnchor
			: null;
	}

	getSelectedMeasures(): readonly MMeasure[] {
		return this.selectedMeasures.filter((measure) => this.contains(measure));
	}

	getSelectedBarline(): EditingBarline | null {
		return this.selectedBarline &&
			this.containsStructuralTarget(this.selectedBarline)
			? this.selectedBarline
			: null;
	}

	/** Select a measure or extend the fixed measure anchor within one part. */
	selectMeasure(measure: MMeasure, opts: SelectionOptions = {}): void {
		this.requireElement(measure);
		const anchor = this.getStructuralAnchor();
		if (opts.extend && anchor && !this.isBarlineTarget(anchor)) {
			if (anchor.part !== measure.part) {
				throw new Error('editing: a measure range must stay within one part');
			}
			const measures = anchor.part.measures;
			const start = measures.indexOf(anchor);
			const end = measures.indexOf(measure);
			this.selectedMeasures = measures.slice(
				Math.min(start, end),
				Math.max(start, end) + 1,
			);
		} else {
			this.structuralAnchor = measure;
			this.selectedMeasures = [measure];
		}
		this.clearNoteSelection();
		this.clearCaret();
		this.selectedBarline = null;
		this.structuralFocus = measure;
		this.selectionChanged();
	}

	/** Select a barline by measure and location, retaining its mdom node when present. */
	selectBarline(target: EditingBarline): void {
		this.requireElement(target.measure);
		const barline =
			target.barline ??
			target.measure.barlines.find(
				(candidate) => candidate.location === target.location,
			) ??
			null;
		if (barline) {
			this.requireElement(barline);
			if (
				barline.parent !== target.measure ||
				barline.location !== target.location
			) {
				throw new Error('editing: barline target does not match its measure');
			}
		}
		const selected = Object.freeze({
			measure: target.measure,
			location: target.location,
			barline,
		});
		this.clearNoteSelection();
		this.clearCaret();
		this.structuralFocus = selected;
		this.structuralAnchor = selected;
		this.selectedMeasures = [];
		this.selectedBarline = selected;
		this.selectionChanged();
	}

	/** Selecting a note starts a selection; extend: true extends the existing voice range.
	 * Chord members, grace notes and invisible notes remain individual targets. */
	select(note: MNote, opts: SelectionOptions = {}): void {
		this.requireNote(note);
		const anchor = this.anchor;
		if (opts.extend && anchor && this.contains(anchor)) {
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
		this.clearStructuralSelection();
		this.focus = note;
		this.clearCaret();
		this.selectionChanged();
	}

	/** Explicit sets may cross parts/voices. The final supplied note becomes focus and anchor. */
	selectNotes(notes: readonly MNote[]): void {
		for (const note of notes) {
			this.requireNote(note);
		}
		this.clearStructuralSelection();
		this.selected = [...new Set(notes)];
		this.focus = this.selected.at(-1) ?? null;
		this.anchor = this.focus;
		this.clearCaret();
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
	move(direction: EditingMove, opts: SelectionOptions = {}): boolean {
		return new EditingNavigator(this).move(
			{
				unit:
					direction === 'next' || direction === 'previous'
						? 'note'
						: 'chordPitch',
				direction: direction === 'next' || direction === 'higher' ? 1 : -1,
			},
			opts,
		);
	}

	/** One group edit is one undo step. Returns false for an empty or unchanged selection. */
	setPitch(spec: PitchInput): boolean {
		return this.history.edit('Set pitch', () =>
			new PitchEdit(this.getSelection()).apply(spec),
		);
	}

	/** Set pitch and fingering together. Tied notes are rejected before the group changes. */
	setTabPosition(spec: TabPositionInput): boolean {
		return this.history.edit('Set tab position', () =>
			new TabPositionEdit(this.getSelection()).apply(spec),
		);
	}

	undo(): boolean {
		return this.history.undo();
	}

	redo(): boolean {
		return this.history.redo();
	}

	private clearNoteSelection(): void {
		this.focus = null;
		this.anchor = null;
		this.selected = [];
	}

	private clearStructuralSelection(): void {
		this.structuralFocus = null;
		this.structuralAnchor = null;
		this.selectedMeasures = [];
		this.selectedBarline = null;
	}

	private contains(element: MElement): boolean {
		let node = element.parent;
		while (node) {
			if (node === this.document.root) {
				return true;
			}
			node = node.parent;
		}
		return false;
	}

	private containsStructuralTarget(target: EditingStructuralTarget): boolean {
		if (!this.isBarlineTarget(target)) {
			return this.contains(target);
		}
		return (
			this.contains(target.measure) &&
			(!target.barline ||
				(this.contains(target.barline) &&
					target.barline.parent === target.measure &&
					target.barline.location === target.location))
		);
	}

	private isBarlineTarget(
		target: EditingStructuralTarget,
	): target is EditingBarline {
		return 'barline' in target;
	}

	private requireElement(element: MElement): void {
		if (!this.contains(element)) {
			throw new Error('editing: target does not belong to this document');
		}
	}

	private requireNote(note: MNote): void {
		this.requireElement(note);
	}

	private requireCaret(caret: EditingCaret): void {
		if (!this.contains(caret.measure) || caret.measure.part !== caret.part) {
			throw new Error('editing: caret does not belong to this document');
		}
		if (
			!caret.voice ||
			!Number.isInteger(caret.staff) ||
			caret.staff < 1 ||
			caret.staff > caret.measure.staveCount ||
			!Number.isFinite(caret.onset) ||
			caret.onset < 0
		) {
			throw new Error('editing: invalid caret target');
		}
	}

	private voiceNotes(note: MNote): MNote[] {
		return note.part.measures.flatMap((measure) =>
			measure.notes.filter((candidate) => candidate.voice === note.voice),
		);
	}
}
