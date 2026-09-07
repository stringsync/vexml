import { describe, expect, it } from 'bun:test';
import { MDocument } from '@stringsync/mdom';
import { disposables } from 'webappwiz/disposable';
import { Rect } from 'webappwiz/geometry';
import { DefaultEditingBindings } from './default-editing-bindings';
import type { EditingControllerOptions } from './editing-controller';
import { EditingSession } from './editing-session';
import { ElementFactory } from './element-factory';
import { FakeDecorations } from './fake-decorations';
import { FakeEditingView } from './fake-editing-view';
import { FakeHost } from './fake-host';
import { FakeViewport } from './fake-viewport';
import { Score } from './score';
import { Sequence } from './sequence';
import { TempoMap } from './tempo-map';

class Key extends Event {
	constructor(
		readonly key: string,
		readonly shiftKey = false,
		readonly ctrlKey = false,
		readonly isComposing = false,
	) {
		super('keydown', { cancelable: true });
	}
	readonly altKey = false;
	readonly metaKey = false;
}
class Click extends Event {
	constructor(
		readonly clientX: number,
		readonly clientY: number,
		readonly shiftKey = false,
		readonly ctrlKey = false,
	) {
		super('click');
	}
	readonly metaKey = false;
}
function fixture() {
	const document = MDocument.empty();
	const measure = document.score.addPart().addMeasure();
	const voice = measure.getOrCreateVoice('1');
	const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
	const second = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
	const other = measure
		.getOrCreateVoice('2')
		.addNote({ step: 'E', octave: 3, type: 'quarter' });
	const hidden = voice.addNote({ step: 'F', octave: 4, type: 'quarter' });
	hidden.setAttribute('print-object', 'no');
	const editor = new EditingSession(document);
	const sequence = new Sequence(
		[],
		new TempoMap([]),
		0,
		1,
		new Map(),
		new Map(),
		new Map(),
	);
	const create = (offset = 0, options: EditingControllerOptions = {}) => {
		const host = new FakeHost();
		const decorations = new FakeDecorations();
		const index = new ElementFactory().build(
			{
				bounds: new Rect(0, 0, 200, 100),
				measures: [
					{
						rect: new Rect(0, 0, 200, 100),
						index: 0,
						number: '1',
						systemIndex: 0,
					},
				],
				notes: [first, second, other].map((mnote, i) => ({
					mnote,
					rect: new Rect(20 + i * 30 + offset, 40, 8, 8),
					chord: [mnote],
					measureIndex: 0,
					tab: i === 2 ? { string: 2, fret: 3 } : null,
					glyph: null,
				})),
				chordDiagrams: [],
			},
			document.score.parts,
			new FakeViewport(),
			decorations,
		);
		const score = new Score(
			host,
			index,
			disposables.noop(),
			sequence,
			host.scroller,
			[],
		);
		const view = new FakeEditingView();
		const controller = score.createEditingController(editor, {
			view,
			...options,
		});
		return { host, score, view, controller, decorations };
	};
	return { editor, first, second, other, hidden, create };
}

describe('EditingController', () => {
	it('handles scoped keys, extends selection and leaves unhandled/modified/composing keys alone', () => {
		const f = fixture();
		const { host, controller } = f.create();
		const arrow = new Key('ArrowRight');
		host.dom.dispatchEvent(arrow);
		expect(arrow.defaultPrevented).toBe(true);
		expect(f.editor.getFocus()).toBe(f.first);
		host.dom.dispatchEvent(new Key('ArrowRight', true));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
		for (const key of [
			new Key('x'),
			new Key('ArrowLeft', false, true),
			new Key('ArrowLeft', false, false, true),
		]) {
			host.dom.dispatchEvent(key);
			expect(key.defaultPrevented).toBe(false);
		}
		expect(f.editor.getFocus()).toBe(f.second);
		controller.dispose();
		const after = new Key('ArrowLeft');
		host.dom.dispatchEvent(after);
		expect(after.defaultPrevented).toBe(false);
		expect(f.editor.getFocus()).toBe(f.second);
	});

	it('selects note/fret hits, extends a voice range, toggles a set, and starts a fresh range across voices', () => {
		const f = fixture();
		const { host, score } = f.create();
		host.dom.dispatchEvent(new Click(22, 42));
		host.dom.dispatchEvent(new Click(52, 42, true));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
		host.dom.dispatchEvent(new Click(82, 42, false, true));
		expect(f.editor.getSelection()).toEqual([f.first, f.second, f.other]);
		host.dom.dispatchEvent(new Click(82, 42, false, true));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
		host.dom.dispatchEvent(new Click(82, 42, true));
		expect(f.editor.getSelection()).toEqual([f.other]);
		host.dom.dispatchEvent(new Click(150, 80));
		expect(f.editor.getSelection()).toEqual([]);
		expect(f.editor.getActiveVoice()?.voice).toBe('2');
		score.dispose();
	});

	it('refreshes after programmatic selection and follows the focus glyph or unindexed note measure', () => {
		const f = fixture();
		const { host, controller, view } = f.create();
		f.editor.select(f.second);
		expect(view.renders.at(-1)?.focus?.getSources()).toEqual([f.second]);
		expect(host.scroller.calls.at(-1)).toEqual(new Rect(50, 40, 8, 8));
		host.scrolled();
		expect(host.scroller.calls.length).toBe(1);
		f.editor.select(f.hidden);
		expect(controller.getPresentation().focus).toBeNull();
		expect(host.scroller.calls.at(-1)).toEqual(new Rect(0, 0, 200, 100));
	});

	it('rebinds persistent selection to replacement render geometry and disposes only its own resources', () => {
		const f = fixture();
		const old = f.create();
		f.editor.select(f.second);
		const oldNote = old.controller.getPresentation().focus;
		old.score.dispose();
		expect(old.view.disposed).toBe(true);
		const count = old.view.renders.length;
		const next = f.create(10);
		expect(next.view.renders.at(-1)?.focus?.getSources()).toEqual([f.second]);
		expect(next.controller.getPresentation().focus).not.toBe(oldNote);
		expect(next.controller.getPresentation().position?.x).toBe(60);
		f.editor.select(f.first);
		expect(old.view.renders.length).toBe(count);
		expect(next.view.renders.at(-1)?.focus?.getSources()).toEqual([f.first]);
		old.host.dom.dispatchEvent(new Click(82, 42));
		expect(f.editor.getFocus()).toBe(f.first);
	});

	it('can retain selection across every user deselection gesture', () => {
		const f = fixture();
		const { host, controller } = f.create(0, {
			allowDeselect: false,
			toggleOnClick: true,
		});
		host.dom.dispatchEvent(new Click(22, 42));
		for (const event of [
			new Click(22, 42),
			new Click(150, 80),
			new Click(22, 42, false, true),
			new Key('Escape'),
		]) {
			host.dom.dispatchEvent(event);
			expect(f.editor.getSelection()).toEqual([f.first]);
		}
		expect(controller.execute({ type: 'clear' })).toBe(false);
		host.dom.dispatchEvent(new Click(52, 42, false, true));
		expect(f.editor.getSelection()).toHaveLength(2);
		host.dom.dispatchEvent(new Click(52, 42, false, true));
		expect(f.editor.getSelection()).toEqual([f.first]);
		host.dom.dispatchEvent(new Click(52, 42));
		expect(f.editor.getSelection()).toEqual([f.second]);
	});

	it('suspends input and visuals while keeping selection without scrolling on reactivation', () => {
		const f = fixture();
		const { host, controller, view } = f.create(0, { enabled: false });
		host.dom.dispatchEvent(new Key('ArrowRight'));
		host.dom.dispatchEvent(new Click(22, 42));
		expect(controller.execute({ type: 'select', note: f.first })).toBe(false);
		expect(controller.selectVoice({ part: f.first.part, voice: '1' })).toBe(
			false,
		);
		expect(f.editor.getFocus()).toBeNull();
		f.editor.select(f.second);
		expect(view.renders.at(-1)).toEqual({
			selected: [],
			focus: null,
			position: null,
		});
		expect(host.scroller.calls).toHaveLength(0);
		controller.setEnabled(true);
		expect(view.renders.at(-1)?.focus?.getSources()).toEqual([f.second]);
		expect(host.scroller.calls).toHaveLength(0);
		controller.setEnabled(false);
		expect(f.editor.getFocus()).toBe(f.second);
		controller.setEnabled(true);
		expect(controller.handleKey(new Key('ArrowLeft'))).toBe(true);
		expect(f.editor.getFocus()).toBe(f.first);
		controller.dispose();
		const count = view.renders.length;
		controller.setEnabled(false);
		expect(view.renders).toHaveLength(count);
	});

	it('allows opting out of native input and following while retaining command execution', () => {
		const f = fixture();
		const { host, controller } = f.create(0, {
			pointer: false,
			keyboard: false,
			follow: false,
		});
		host.dom.dispatchEvent(new Key('ArrowRight'));
		host.dom.dispatchEvent(new Click(22, 42));
		expect(f.editor.getFocus()).toBeNull();
		controller.execute({ type: 'move', move: { unit: 'note', direction: 1 } });
		expect(f.editor.getFocus()).toBe(f.first);
		expect(host.scroller.calls).toEqual([]);
		controller.scrollIntoView();
		expect(host.scroller.calls.length).toBe(1);
	});

	it('draws every selected note and fret on its own overlay without touching decoration state', () => {
		const f = fixture();
		const { host, decorations, score } = f.create(0, { view: undefined });
		f.editor.selectNotes([f.first, f.other]);
		const layer = host.created[0];
		expect(layer?.recording.fills.length).toBe(11); // Three washes; four edges on note and fret focus.
		const note = score.getElements().noteLookup.get(f.first);
		expect(note && decorations.color.has(note)).toBe(false);
		f.editor.clearSelection();
		expect(layer?.recording.clears.length).toBe(5);
		score.dispose();
		expect(layer?.disposed).toBe(true);
	});
});

describe('EditingController chord entry commands', () => {
	it('maps up/down to vertical movement and selects explicit chord edges', () => {
		const f = fixture();
		const chord = f.first.measure.getOrCreateVoice('1').addChord(
			[
				{ step: 'E', octave: 4 },
				{ step: 'G', octave: 4 },
			],
			{ type: 'whole' },
		);
		const high = chord.notes[1];
		if (!high) {
			throw new Error('missing upper chord note');
		}
		const { controller } = f.create();
		controller.execute({ type: 'select', note: chord.lead, chordEdge: 'top' });
		expect(f.editor.getFocus()).toBe(high);
		const bindings = new DefaultEditingBindings();
		const down = bindings.resolve(new Key('ArrowDown'));
		if (!down) {
			throw new Error('missing Down binding');
		}
		controller.execute(down);
		expect(f.editor.getFocus()).toBe(chord.lead);
		const up = bindings.resolve(new Key('ArrowUp'));
		if (!up) {
			throw new Error('missing Up binding');
		}
		controller.execute(up);
		expect(f.editor.getFocus()).toBe(high);
		controller.execute({ type: 'select', note: high, chordEdge: 'bottom' });
		expect(f.editor.getFocus()).toBe(chord.lead);
	});
});
