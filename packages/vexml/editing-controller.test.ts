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
	readonly pointerId = 1;
}
class Pointer extends Event {
	constructor(
		type: string,
		readonly clientX: number,
		readonly clientY: number,
		readonly ctrlKey = false,
		readonly metaKey = false,
		readonly pointerId = 1,
		readonly pointerType = 'mouse',
		readonly button = 0,
		readonly buttons = type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
	) {
		super(type, { cancelable: true });
	}
	readonly isPrimary = true;
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
					glyph: {
						text: i === 2 ? '3' : 'q',
						font: '30px Bravura',
						x: 20 + i * 30 + offset,
						y: 40,
					},
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
	it('previews a rectangle across voices, commits on release and consumes its click without scrolling', () => {
		const f = fixture();
		const { host, controller } = f.create();
		f.editor.select(f.hidden);
		const scrolls = host.scroller.calls.length;
		host.dom.dispatchEvent(new Pointer('pointerdown', 100, 60));
		host.dom.dispatchEvent(new Pointer('pointermove', 10, 30));
		expect(controller.getPresentation().marquee).toEqual(
			new Rect(10, 30, 90, 30),
		);
		expect(controller.getPresentation().selected).toHaveLength(3);
		expect(f.editor.getSelection()).toEqual([f.hidden]);
		host.dom.dispatchEvent(new Pointer('pointerup', 10, 30));
		expect(f.editor.getSelection()).toEqual([f.first, f.second, f.other]);
		expect(controller.getPresentation().marquee).toBeUndefined();
		host.dom.dispatchEvent(new Click(10, 30));
		expect(f.editor.getSelection()).toHaveLength(3);
		expect(host.scroller.calls).toHaveLength(scrolls);
	});

	it('adds to the starting selection with either platform modifier and removes departed preview hits', () => {
		for (const modifier of ['ctrl', 'meta']) {
			const f = fixture();
			const { host, controller } = f.create();
			f.editor.select(f.other);
			host.dom.dispatchEvent(
				new Pointer(
					'pointerdown',
					10,
					30,
					modifier === 'ctrl',
					modifier === 'meta',
				),
			);
			host.dom.dispatchEvent(new Pointer('pointermove', 60, 60));
			expect(controller.getPresentation().selected).toHaveLength(3);
			host.dom.dispatchEvent(new Pointer('pointermove', 30, 60));
			expect(controller.getPresentation().selected).toHaveLength(2);
			host.dom.dispatchEvent(new Pointer('pointerup', 30, 60));
			expect(f.editor.getSelection()).toEqual([f.other, f.first]);
		}
	});

	it('keeps tiny drags as clicks and respects empty-selection policy', () => {
		for (const allowDeselect of [true, false]) {
			const f = fixture();
			const { host, controller } = f.create(0, { allowDeselect });
			host.dom.dispatchEvent(new Pointer('pointerdown', 22, 42));
			host.dom.dispatchEvent(new Pointer('pointerup', 23, 43));
			host.dom.dispatchEvent(new Click(23, 43));
			expect(f.editor.getSelection()).toEqual([f.first]);
			host.dom.dispatchEvent(new Pointer('pointerdown', 100, 60));
			host.dom.dispatchEvent(new Pointer('pointerup', 150, 80));
			expect(f.editor.getSelection()).toEqual(allowDeselect ? [] : [f.first]);
			expect(controller.getPresentation().marquee).toBeUndefined();
		}
	});

	it('commits the preview once when released capture is lost before pointerup', () => {
		const f = fixture();
		const { host, controller } = f.create();
		f.editor.select(f.other);
		let commits = 0;
		f.editor.events.on('selectionchange', () => commits++);
		host.dom.dispatchEvent(new Pointer('pointerdown', 10, 30));
		host.dom.dispatchEvent(new Pointer('pointermove', 60, 60));
		// Capture-loss coordinates may be zero; preserve the displayed preview.
		host.dom.dispatchEvent(
			new Pointer('lostpointercapture', 0, 0, false, false, 2, 'mouse', -1, 0),
		);
		expect(controller.getPresentation().marquee).toBeDefined();
		host.dom.dispatchEvent(
			new Pointer('lostpointercapture', 0, 0, false, false, 1, 'mouse', -1, 0),
		);
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
		expect(controller.getPresentation().marquee).toBeUndefined();
		host.dom.dispatchEvent(new Pointer('pointerup', 60, 60));
		host.dom.dispatchEvent(new Click(60, 60));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
		expect(commits).toBe(1);
	});

	it('cancels previews on Escape, capture loss, cancellation, suspension and disposal', () => {
		for (const action of [
			'Escape',
			'pointercancel',
			'lostpointercapture',
			'disable',
			'dispose',
		]) {
			const f = fixture();
			const { host, controller, view } = f.create();
			f.editor.select(f.other);
			host.dom.dispatchEvent(new Pointer('pointerdown', 10, 30));
			host.dom.dispatchEvent(new Pointer('pointermove', 60, 60));
			if (action === 'disable') {
				controller.setEnabled(false);
			} else if (action === 'dispose') {
				controller.dispose();
			} else if (action === 'Escape') {
				host.dom.dispatchEvent(new Key('Escape'));
			} else {
				host.dom.dispatchEvent(new Pointer(action, 60, 60));
			}
			expect(view.renders.at(-1)?.marquee).toBeUndefined();
			host.dom.dispatchEvent(new Pointer('pointerup', 60, 60));
			expect(f.editor.getSelection()).toEqual([f.other]);
		}
	});

	it('ignores touch drags, secondary buttons, other pointers and disabled pointer input', () => {
		const f = fixture();
		const { host, controller } = f.create();
		for (const event of [
			new Pointer('pointerdown', 10, 30, false, false, 1, 'touch'),
			new Pointer('pointerdown', 10, 30, false, false, 1, 'mouse', 2),
		]) {
			host.dom.dispatchEvent(event);
			host.dom.dispatchEvent(new Pointer('pointermove', 60, 60));
			expect(controller.getPresentation().marquee).toBeUndefined();
		}
		host.dom.dispatchEvent(new Pointer('pointerdown', 10, 30));
		host.dom.dispatchEvent(new Pointer('pointerup', 60, 60, false, false, 2));
		expect(f.editor.getSelection()).toEqual([]);
		host.dom.dispatchEvent(new Pointer('pointerup', 60, 60));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
		const disabled = f.create(0, { pointer: false });
		disabled.host.dom.dispatchEvent(new Pointer('pointerdown', 10, 30));
		disabled.host.dom.dispatchEvent(new Pointer('pointerup', 100, 60));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
	});

	it('handles scoped keys without Shift extension and leaves unhandled/modified/composing keys alone', () => {
		const f = fixture();
		const { host, controller } = f.create();
		const arrow = new Key('ArrowRight');
		host.dom.dispatchEvent(arrow);
		expect(arrow.defaultPrevented).toBe(true);
		expect(f.editor.getFocus()).toBe(f.first);
		host.dom.dispatchEvent(new Key('ArrowRight', true));
		expect(f.editor.getSelection()).toEqual([f.second]);
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

	it('selects notes and frets, toggles a set, and treats Shift-click as a plain click', () => {
		const f = fixture();
		const { host, score } = f.create();
		host.dom.dispatchEvent(new Click(22, 42));
		host.dom.dispatchEvent(new Click(52, 42, true));
		expect(f.editor.getSelection()).toEqual([f.second]);
		host.dom.dispatchEvent(new Click(82, 42, false, true));
		expect(f.editor.getSelection()).toEqual([f.second, f.other]);
		host.dom.dispatchEvent(new Click(82, 42, false, true));
		expect(f.editor.getSelection()).toEqual([f.second]);
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

	it('colors selected notes, with a region and cursor-only halo and outline', () => {
		const f = fixture();
		const { host, decorations, score } = f.create(0, {
			view: undefined,
			selection: { color: '#ff3d9e', focusColor: '#a80050' },
		});
		f.editor.selectNotes([f.first, f.other]);
		const layer = host.created[0];
		const focus = host.created[1];
		expect(layer?.kind).toBe('background');
		expect(focus?.kind).toBe('content');
		expect(focus?.zIndex).toBe(2);
		expect(focus?.recording.ops.filter((op) => op.startsWith('text:'))).toEqual(
			[
				'text:q:#ff3d9e:30px Bravura',
				'text:3:#ff3d9e:30px Bravura',
				'text:3:#ff3d9e:30px Bravura',
			],
		);
		expect(layer?.recording.ops.filter((op) => op.startsWith('fill:'))).toEqual(
			['fill:arc:#ff3d9e', 'fill:arc:#ff3d9e'],
		);
		expect(layer?.recording.fills).toHaveLength(1);
		expect(
			focus?.recording.ops.filter((op) => op.startsWith('stroke:')),
		).toEqual(['stroke:arc:#a80050', 'stroke:arc:#a80050']);
		const note = score.getElements().noteLookup.get(f.first);
		expect(note && decorations.color.has(note)).toBe(false);
		expect(note && decorations.halo.has(note)).toBe(false);
		f.editor.clearSelection();
		expect(layer?.recording.clears.length).toBe(3);
		expect(focus?.recording.clears.length).toBe(5);
		score.dispose();
		expect(layer?.disposed).toBe(true);
		expect(focus?.disposed).toBe(true);
	});

	it('removes the group region when selection shrinks to one note', () => {
		const f = fixture();
		const { host } = f.create(0, { view: undefined });
		f.editor.selectNotes([f.first, f.second]);
		const layer = host.created[0];
		const region = layer?.recording.fills[0];
		f.editor.select(f.second);
		expect(layer?.recording.fills).toHaveLength(1);
		expect(region && layer?.recording.clears).toContainEqual({
			x: (region?.x ?? 0) - 1,
			y: (region?.y ?? 0) - 1,
			w: (region?.w ?? 0) + 2,
			h: (region?.h ?? 0) + 2,
		});
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
