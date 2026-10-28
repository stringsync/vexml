import { beforeEach, describe, expect, it } from 'bun:test';
import { MDocument } from '@stringsync/mdom';
import { disposables } from 'webappwiz/disposable';
import { Rect } from 'webappwiz/geometry';
import { DefaultEditingBindings } from './default-editing-bindings';
import type { EditingControllerOptions } from './editing-controller';
import { EditingSession } from './editing-session';
import { ElementFactory } from './element-factory';
import { FakeClickEvent } from './fake-click-event';
import { FakeDecorations } from './fake-decorations';
import { FakeEditingView } from './fake-editing-view';
import { FakeHost } from './fake-host';
import { FakeKeyEvent } from './fake-key-event';
import { FakePointerEvent } from './fake-pointer-event';
import { FakeViewport } from './fake-viewport';
import { renderedScore } from './render-harness';
import { Score } from './score';
import { Sequence } from './sequence';
import { TempoMap } from './tempo-map';

describe('EditingController', () => {
	let f: Fixture;

	beforeEach(() => {
		f = fixture();
	});

	it('previews a rectangle across voices, commits on release and consumes its click without scrolling', () => {
		const { host, controller } = f.create();
		f.editor.select(f.hidden);
		const scrolls = host.scroller.calls.length;
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 100, 60));
		host.dom.dispatchEvent(new FakePointerEvent('pointermove', 10, 30));
		expect(controller.getPresentation().marquee).toEqual(
			new Rect(10, 30, 90, 30),
		);
		expect(controller.getPresentation().selected).toHaveLength(3);
		expect(f.editor.getSelection()).toEqual([f.hidden]);
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 10, 30));
		expect(f.editor.getSelection()).toEqual([f.first, f.second, f.other]);
		expect(controller.getPresentation().marquee).toBeUndefined();
		host.dom.dispatchEvent(new FakeClickEvent(10, 30));
		expect(f.editor.getSelection()).toHaveLength(3);
		expect(host.scroller.calls).toHaveLength(scrolls);
	});

	it.each([
		['ctrl', { ctrlKey: true }],
		['meta', { metaKey: true }],
	])('adds to the starting selection with the %s modifier and removes departed preview hits', (_, modifier) => {
		const { host, controller } = f.create();
		f.editor.select(f.other);
		host.dom.dispatchEvent(
			new FakePointerEvent('pointerdown', 10, 30, modifier),
		);
		host.dom.dispatchEvent(new FakePointerEvent('pointermove', 60, 60));
		expect(controller.getPresentation().selected).toHaveLength(3);
		host.dom.dispatchEvent(new FakePointerEvent('pointermove', 30, 60));
		expect(controller.getPresentation().selected).toHaveLength(2);
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 30, 60));
		expect(f.editor.getSelection()).toEqual([f.other, f.first]);
	});

	it('clears the selection on an empty-space drag when deselecting is allowed, keeping tiny drags as clicks', () => {
		const { host, controller } = f.create(0, { allowDeselect: true });
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 22, 42));
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 23, 43));
		host.dom.dispatchEvent(new FakeClickEvent(23, 43));
		expect(f.editor.getSelection()).toEqual([f.first]);
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 100, 60));
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 150, 80));
		expect(f.editor.getSelection()).toEqual([]);
		expect(controller.getPresentation().marquee).toBeUndefined();
	});

	it('keeps the selection on an empty-space drag when deselecting is disallowed, keeping tiny drags as clicks', () => {
		const { host, controller } = f.create(0, { allowDeselect: false });
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 22, 42));
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 23, 43));
		host.dom.dispatchEvent(new FakeClickEvent(23, 43));
		expect(f.editor.getSelection()).toEqual([f.first]);
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 100, 60));
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 150, 80));
		expect(f.editor.getSelection()).toEqual([f.first]);
		expect(controller.getPresentation().marquee).toBeUndefined();
	});

	it('commits the preview once when released capture is lost before pointerup', () => {
		const { host, controller } = f.create();
		f.editor.select(f.other);
		let commits = 0;
		f.editor.events.on('selectionchange', () => commits++);
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 10, 30));
		host.dom.dispatchEvent(new FakePointerEvent('pointermove', 60, 60));
		// Capture-loss coordinates may be zero; preserve the displayed preview.
		host.dom.dispatchEvent(
			new FakePointerEvent('lostpointercapture', 0, 0, {
				pointerId: 2,
				button: -1,
				buttons: 0,
			}),
		);
		expect(controller.getPresentation().marquee).toBeDefined();
		host.dom.dispatchEvent(
			new FakePointerEvent('lostpointercapture', 0, 0, {
				button: -1,
				buttons: 0,
			}),
		);
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
		expect(controller.getPresentation().marquee).toBeUndefined();
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 60, 60));
		host.dom.dispatchEvent(new FakeClickEvent(60, 60));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
		expect(commits).toBe(1);
	});

	it('cancels the preview on Escape', () => {
		const { host, view } = f.create();
		f.editor.select(f.other);
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 10, 30));
		host.dom.dispatchEvent(new FakePointerEvent('pointermove', 60, 60));
		host.dom.dispatchEvent(new FakeKeyEvent('Escape'));
		expect(view.renders.at(-1)?.marquee).toBeUndefined();
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 60, 60));
		expect(f.editor.getSelection()).toEqual([f.other]);
	});

	it.each([
		'pointercancel',
		'lostpointercapture',
	])('cancels the preview on %s', (type) => {
		const { host, view } = f.create();
		f.editor.select(f.other);
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 10, 30));
		host.dom.dispatchEvent(new FakePointerEvent('pointermove', 60, 60));
		host.dom.dispatchEvent(new FakePointerEvent(type, 60, 60));
		expect(view.renders.at(-1)?.marquee).toBeUndefined();
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 60, 60));
		expect(f.editor.getSelection()).toEqual([f.other]);
	});

	it('cancels the preview when the controller is suspended', () => {
		const { host, controller, view } = f.create();
		f.editor.select(f.other);
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 10, 30));
		host.dom.dispatchEvent(new FakePointerEvent('pointermove', 60, 60));
		controller.setEnabled(false);
		expect(view.renders.at(-1)?.marquee).toBeUndefined();
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 60, 60));
		expect(f.editor.getSelection()).toEqual([f.other]);
	});

	it('cancels the preview when the controller is disposed', () => {
		const { host, controller, view } = f.create();
		f.editor.select(f.other);
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 10, 30));
		host.dom.dispatchEvent(new FakePointerEvent('pointermove', 60, 60));
		controller.dispose();
		expect(view.renders.at(-1)?.marquee).toBeUndefined();
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 60, 60));
		expect(f.editor.getSelection()).toEqual([f.other]);
	});

	it.each([
		['touch drags', { pointerType: 'touch' }],
		['secondary buttons', { button: 2 }],
	])('ignores %s', (_, opts) => {
		const { host, controller } = f.create();
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 10, 30, opts));
		host.dom.dispatchEvent(new FakePointerEvent('pointermove', 60, 60));
		expect(controller.getPresentation().marquee).toBeUndefined();
	});

	it('ignores a release from another pointer', () => {
		const { host } = f.create();
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 10, 30));
		host.dom.dispatchEvent(
			new FakePointerEvent('pointerup', 60, 60, { pointerId: 2 }),
		);
		expect(f.editor.getSelection()).toEqual([]);
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 60, 60));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
	});

	it('ignores pointer input when it is disabled', () => {
		const { host } = f.create(0, { pointer: false });
		host.dom.dispatchEvent(new FakePointerEvent('pointerdown', 10, 30));
		host.dom.dispatchEvent(new FakePointerEvent('pointerup', 100, 60));
		expect(f.editor.getSelection()).toEqual([]);
	});

	it('handles scoped keys, extending the selection with Shift', () => {
		const { host } = f.create();
		const arrow = new FakeKeyEvent('ArrowRight');
		host.dom.dispatchEvent(arrow);
		expect(arrow.defaultPrevented).toBe(true);
		expect(f.editor.getFocus()).toBe(f.first);
		host.dom.dispatchEvent(new FakeKeyEvent('ArrowRight', { shiftKey: true }));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
	});

	it.each([
		['an unhandled key', 'x', {}],
		['a modified key', 'ArrowLeft', { ctrlKey: true }],
		['a composing key', 'ArrowLeft', { isComposing: true }],
	])('leaves %s alone', (_, key, opts) => {
		const { host } = f.create();
		host.dom.dispatchEvent(new FakeKeyEvent('ArrowRight'));
		host.dom.dispatchEvent(new FakeKeyEvent('ArrowRight'));
		const event = new FakeKeyEvent(key, opts);
		host.dom.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(false);
		expect(f.editor.getFocus()).toBe(f.second);
	});

	it('leaves keys alone after it is disposed', () => {
		const { host, controller } = f.create();
		host.dom.dispatchEvent(new FakeKeyEvent('ArrowRight'));
		controller.dispose();
		const after = new FakeKeyEvent('ArrowLeft');
		host.dom.dispatchEvent(after);
		expect(after.defaultPrevented).toBe(false);
		expect(f.editor.getFocus()).toBe(f.first);
	});

	it('extends within a voice, toggles frets and rejects cross-voice Shift-clicks', () => {
		const { host, score } = f.create();
		host.dom.dispatchEvent(new FakeClickEvent(22, 42));
		host.dom.dispatchEvent(new FakeClickEvent(52, 42, { shiftKey: true }));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
		host.dom.dispatchEvent(new FakeClickEvent(82, 42, { ctrlKey: true }));
		expect(f.editor.getSelection()).toEqual([f.first, f.second, f.other]);
		host.dom.dispatchEvent(new FakeClickEvent(82, 42, { ctrlKey: true }));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
		host.dom.dispatchEvent(new FakeClickEvent(82, 42, { shiftKey: true }));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
		host.dom.dispatchEvent(new FakeClickEvent(150, 80));
		expect(f.editor.getSelection()).toEqual([]);
		expect(f.editor.getActiveVoice()?.voice).toBe('1');
		score.dispose();
	});

	it('refreshes after programmatic selection and follows the focus glyph or unindexed note measure', () => {
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
		old.host.dom.dispatchEvent(new FakeClickEvent(82, 42));
		expect(f.editor.getFocus()).toBe(f.first);
	});

	it.each([
		['clicking the selected note', () => new FakeClickEvent(22, 42)],
		['clicking empty space', () => new FakeClickEvent(150, 80)],
		[
			'ctrl-clicking the selected note',
			() => new FakeClickEvent(22, 42, { ctrlKey: true }),
		],
		['pressing Escape', () => new FakeKeyEvent('Escape')],
	])('retains the selection when %s without deselecting', (_, gesture) => {
		const { host } = f.create(0, {
			allowDeselect: false,
			toggleOnClick: true,
		});
		host.dom.dispatchEvent(new FakeClickEvent(22, 42));
		host.dom.dispatchEvent(gesture());
		expect(f.editor.getSelection()).toEqual([f.first]);
	});

	it('refuses to clear a retained selection but still toggles and replaces notes', () => {
		const { host, controller } = f.create(0, {
			allowDeselect: false,
			toggleOnClick: true,
		});
		host.dom.dispatchEvent(new FakeClickEvent(22, 42));
		expect(controller.execute({ type: 'clear' })).toBe(false);
		host.dom.dispatchEvent(new FakeClickEvent(52, 42, { ctrlKey: true }));
		expect(f.editor.getSelection()).toHaveLength(2);
		host.dom.dispatchEvent(new FakeClickEvent(52, 42, { ctrlKey: true }));
		expect(f.editor.getSelection()).toEqual([f.first]);
		host.dom.dispatchEvent(new FakeClickEvent(52, 42));
		expect(f.editor.getSelection()).toEqual([f.second]);
	});

	it.each([
		['Escape', () => new FakeKeyEvent('Escape')],
		['an empty-space click', () => new FakeClickEvent(150, 80)],
		['a click on the third note', () => new FakeClickEvent(82, 42)],
	])('dismisses a range of notes to its focus on %s without moving focus or scrolling', (_, dismissal) => {
		const { host, controller } = f.create(0, { allowDeselect: false });
		f.editor.select(f.first);
		f.editor.select(f.second, { extend: true });
		const position = controller.getPresentation().position;
		const scrolls = host.scroller.calls.length;
		host.dom.dispatchEvent(dismissal());
		expect(f.editor.getSelection()).toEqual([f.second]);
		expect(f.editor.getFocus()).toBe(f.second);
		expect(controller.getPresentation().position).toBe(position);
		expect(host.scroller.calls).toHaveLength(scrolls);
		host.dom.dispatchEvent(new FakeKeyEvent('ArrowLeft', { shiftKey: true }));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
	});

	it.each([
		['Escape', () => new FakeKeyEvent('Escape')],
		['an empty-space click', () => new FakeClickEvent(150, 80)],
		['a click on the third note', () => new FakeClickEvent(82, 42)],
	])('dismisses an explicit set of notes to its focus on %s without moving focus or scrolling', (_, dismissal) => {
		const { host, controller } = f.create(0, { allowDeselect: false });
		f.editor.selectNotes([f.first, f.second]);
		const position = controller.getPresentation().position;
		const scrolls = host.scroller.calls.length;
		host.dom.dispatchEvent(dismissal());
		expect(f.editor.getSelection()).toEqual([f.second]);
		expect(f.editor.getFocus()).toBe(f.second);
		expect(controller.getPresentation().position).toBe(position);
		expect(host.scroller.calls).toHaveLength(scrolls);
		host.dom.dispatchEvent(new FakeKeyEvent('ArrowLeft', { shiftKey: true }));
		expect(f.editor.getSelection()).toEqual([f.first, f.second]);
	});

	it('suspends input and visuals while keeping selection without scrolling on reactivation', () => {
		const { host, controller, view } = f.create(0, { enabled: false });
		host.dom.dispatchEvent(new FakeKeyEvent('ArrowRight'));
		host.dom.dispatchEvent(new FakeClickEvent(22, 42));
		expect(controller.execute({ type: 'select', note: f.first })).toBe(false);
		expect(controller.selectVoice({ part: f.first.part, voice: '1' })).toBe(
			false,
		);
		expect(f.editor.getFocus()).toBeNull();
		f.editor.select(f.second);
		expect(view.renders.at(-1)).toEqual({
			selected: [],
			focus: null,
			caret: null,
			measures: [],
			barline: null,
			structuralFocus: null,
			position: null,
		});
		expect(host.scroller.calls).toHaveLength(0);
		controller.setEnabled(true);
		expect(view.renders.at(-1)?.focus?.getSources()).toEqual([f.second]);
		expect(host.scroller.calls).toHaveLength(0);
		controller.setEnabled(false);
		expect(f.editor.getFocus()).toBe(f.second);
		controller.setEnabled(true);
		expect(controller.handleKey(new FakeKeyEvent('ArrowLeft'))).toBe(true);
		expect(f.editor.getFocus()).toBe(f.first);
		controller.dispose();
		const count = view.renders.length;
		controller.setEnabled(false);
		expect(view.renders).toHaveLength(count);
	});

	it('resolves and follows a caret before, between and after notes', () => {
		const { host, controller } = f.create();
		const target = {
			part: f.first.part,
			measure: f.first.measure,
			voice: '1',
			staff: 1,
		};
		f.editor.setCaret({ ...target, onset: 0 });
		expect(controller.getPresentation().caret).toEqual(new Rect(20, 40, 0, 40));
		f.editor.moveCaret(0.5);
		expect(controller.getPresentation().caret).toEqual(new Rect(35, 40, 0, 40));
		expect(host.scroller.calls.at(-1)).toEqual(new Rect(35, 40, 0, 40));
		f.editor.moveCaret(3);
		expect(controller.getPresentation().caret).toEqual(
			new Rect(200, 40, 0, 40),
		);
	});

	it('clears the caret for note selection and honors allowDeselect on dismissal', () => {
		const { host, controller } = f.create(0, { allowDeselect: false });
		const target = {
			part: f.first.part,
			measure: f.first.measure,
			voice: '1',
			staff: 1,
			onset: 0,
		};
		f.editor.setCaret(target);
		host.dom.dispatchEvent(new FakeClickEvent(22, 42));
		expect(f.editor.getCaret()).toBeNull();
		expect(f.editor.getSelection()).toEqual([f.first]);
		f.editor.setCaret(target);
		host.dom.dispatchEvent(new FakeClickEvent(150, 80));
		expect(f.editor.getCaret()).toEqual(target);
		expect(controller.execute({ type: 'clear' })).toBe(false);
		expect(f.editor.getCaret()).toEqual(target);
		controller.setEnabled(false);
		expect(controller.getPresentation().caret).toEqual(new Rect(20, 40, 0, 40));
	});

	it('rebinds the caret to replacement render geometry', () => {
		const old = f.create();
		f.editor.setCaret({
			part: f.first.part,
			measure: f.first.measure,
			voice: '1',
			staff: 1,
			onset: 0.5,
		});
		old.score.dispose();
		const next = f.create(10);
		expect(next.controller.getPresentation().caret).toEqual(
			new Rect(45, 40, 0, 40),
		);
	});

	it('draws a configured caret, clears its ink and disposes its layers', () => {
		const { host, score } = f.create(0, {
			view: undefined,
			selection: { caretColor: '#123456', caretWidth: 4 },
		});
		f.editor.setCaret({
			part: f.first.part,
			measure: f.first.measure,
			voice: '1',
			staff: 1,
			onset: 0,
		});
		const focus = host.created[1];
		expect(focus?.recording.fills).toContainEqual({
			x: 18,
			y: 40,
			w: 4,
			h: 40,
			style: '#123456',
		});
		f.editor.clearCaret();
		expect(focus?.recording.clears).toContainEqual({
			x: 17,
			y: 39,
			w: 6,
			h: 42,
		});
		score.dispose();
		expect(host.created.every((layer) => layer.disposed)).toBe(true);
	});

	it('allows opting out of native input and following while retaining command execution', () => {
		const { host, controller } = f.create(0, {
			pointer: false,
			keyboard: false,
			follow: false,
		});
		host.dom.dispatchEvent(new FakeKeyEvent('ArrowRight'));
		host.dom.dispatchEvent(new FakeClickEvent(22, 42));
		expect(f.editor.getFocus()).toBeNull();
		controller.execute({ type: 'move', move: { unit: 'note', direction: 1 } });
		expect(f.editor.getFocus()).toBe(f.first);
		expect(host.scroller.calls).toEqual([]);
		controller.scrollIntoView();
		expect(host.scroller.calls.length).toBe(1);
	});

	it('makes no selection layers until there is a selection to draw', () => {
		const { host, controller } = f.create(0, {
			view: undefined,
			enabled: false,
		});
		controller.setEnabled(true);
		controller.setEnabled(false);
		expect(host.created).toHaveLength(0);
		controller.setEnabled(true);
		f.editor.select(f.first);
		expect(host.created.map((layer) => layer.kind)).toEqual([
			'background',
			'content',
		]);
	});

	// scry-ignore simple-test-setup: the controller options (view, selection colors) are the input this test checks, so they stay beside its assertions rather than in a beforeEach other tests do not share
	it('colors selected notes, with a region and cursor-only halo and outline', () => {
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

	it('maps up/down to vertical movement and selects explicit chord edges', () => {
		const chord = f.editor.history.edit('Add chord', () =>
			f.first.measure.getOrCreateVoice('1').addChord(
				[
					{ step: 'E', octave: 4 },
					{ step: 'G', octave: 4 },
				],
				{ type: 'whole' },
			),
		);
		const high = required(chord.notes[1], 'upper chord note');
		const { controller } = f.create();
		controller.execute({ type: 'select', note: chord.lead, chordEdge: 'top' });
		expect(f.editor.getFocus()).toBe(high);
		const bindings = new DefaultEditingBindings();
		controller.execute(
			required(bindings.resolve(new FakeKeyEvent('ArrowDown')), 'Down binding'),
		);
		expect(f.editor.getFocus()).toBe(chord.lead);
		controller.execute(
			required(bindings.resolve(new FakeKeyEvent('ArrowUp')), 'Up binding'),
		);
		expect(f.editor.getFocus()).toBe(high);
		controller.execute({ type: 'select', note: high, chordEdge: 'bottom' });
		expect(f.editor.getFocus()).toBe(chord.lead);
	});

	it('selects explicit repeat and implicit ordinary barlines by pointer', async () => {
		const { score, editor, controller, click, key } =
			await structural('repeats.musicxml');
		const barlines = score.getElements().barlines();
		const forward = required(
			barlines.find(
				(barline) =>
					barline.getLocation() === 'left' &&
					barline.getSources()[0]?.repeat === 'forward',
			),
			'forward repeat',
		);
		const implicit = required(
			barlines.find(
				(barline) =>
					barline.getLocation() === 'right' &&
					barline.getSources().length === 0,
			),
			'implicit barline',
		);
		click(forward.rect);
		expect(editor.getSelectedBarline()).toEqual({
			measure: required(forward.getMeasure().getSources()[0], 'measure'),
			location: 'left',
			barline: required(forward.getSources()[0], 'repeat barline'),
		});
		expect(controller.getPresentation().barline).toBe(forward);
		expect(controller.getPresentation().structuralFocus).toBe(forward);
		expect(controller.getPresentation().position).toBe(forward.rect);

		click(implicit.rect);
		const selected = required(editor.getSelectedBarline(), 'selection');
		expect(selected.location).toBe('right');
		expect(selected.barline).toBeNull();
		expect(selected.measure).toBe(
			required(implicit.getMeasure().getSources()[0], 'measure'),
		);
		expect(controller.getPresentation().barline).toBe(implicit);

		// Shift-click selects one barline at a time; arrows step through the part's barlines.
		click(forward.rect, true);
		expect(controller.getPresentation().barline).toBe(forward);
		key('ArrowRight');
		expect(editor.getSelectedBarline()).toEqual({
			measure: required(forward.getMeasure().getSources()[0], 'measure'),
			location: 'right',
			barline: null,
		});
	});

	it('selects an empty measure in the clicked part only', async () => {
		const { score, editor, controller, click } = await structural(
			'structure_two_parts.musicxml',
		);
		const [top, bottom] = score.getElements().measures();
		const lower = required(bottom, 'second part measure');
		click(lower.rect);
		expect(editor.getSelectedMeasures()).toEqual([
			required(lower.getSources()[0], 'measure'),
		]);
		expect(controller.getPresentation().measures).toEqual([lower]);
		expect(controller.getPresentation().measures).not.toContain(top);
		expect(controller.getPresentation().structuralFocus).toBe(lower);

		// A measure range never crosses parts: Shift-click in another part starts afresh.
		click(required(top, 'first part measure').rect, true);
		expect(editor.getSelectedMeasures()).toEqual([
			required(top?.getSources()[0], 'measure'),
		]);
	});

	it('extends a measure range forwards and backwards across a wrapped system', async () => {
		const { score, editor, controller, click, key } = await structural(
			'print_new_system.musicxml',
			{ view: undefined },
		);
		const measures = score.getElements().measures();
		expect(new Set(measures.map((m) => m.getBox().getSystem())).size).toBe(2);
		const at = (i: number) => required(measures[i], `measure ${i}`);
		const blank = (i: number) => {
			// Staff space between the start of the bar and its first note.
			const rect = at(i).rect;
			return new Rect(rect.x + 2, rect.y + 2, 2, 2);
		};
		const sources = (from: number, to: number) =>
			measures.slice(from, to + 1).flatMap((m) => m.getSources());

		click(at(1).rect);
		click(at(3).rect, true);
		expect(editor.getSelectedMeasures()).toEqual(sources(1, 3));
		click(blank(0), true);
		expect(editor.getSelectedMeasures()).toEqual(sources(0, 1));
		expect(controller.getPresentation().structuralFocus).toBe(at(0));

		key('ArrowRight', true);
		key('ArrowRight', true);
		key('ArrowRight', true);
		expect(editor.getSelectedMeasures()).toEqual(sources(1, 3));
		key('ArrowLeft', true);
		expect(editor.getSelectedMeasures()).toEqual(sources(1, 2));
		expect(controller.getPresentation().measures).toEqual([at(1), at(2)]);

		// A plain arrow collapses the range to the bar it moves to.
		key('ArrowRight', true);
		key('ArrowLeft');
		expect(editor.getSelectedMeasures()).toEqual(sources(2, 2));
		key('ArrowRight', true);
		expect(controller.getPresentation().measures).toEqual([at(2), at(3)]);
	});

	it('extends from the focused note to a Shift-clicked bar, and a note click drops the range', async () => {
		const { score, editor, click, key } = await structural(
			'print_new_system.musicxml',
		);
		const notes = score.getElements().notes();
		const measures = score.getElements().measures();
		const note = required(notes[1], 'second note');
		click(note.rect);
		click(required(measures[3], 'last measure').rect, true);
		expect(editor.getSelectedMeasures()).toEqual(
			measures.slice(1).flatMap((m) => m.getSources()),
		);
		expect(editor.getSelection()).toEqual([]);

		click(required(notes[0], 'first note').rect);
		expect(editor.getSelectedMeasures()).toEqual([]);
		expect(editor.getFocus()).toBe(
			required(notes[0]?.getSources()[0], 'first mdom note'),
		);

		click(required(measures[0], 'first measure').rect);
		key('Escape');
		expect(editor.getStructuralFocus()).toBeNull();
	});

	it('follows a structural focus and leaves history untouched', async () => {
		const { score, document, stage, click, key } = await structural(
			'print_new_system.musicxml',
		);
		let changes = 0;
		document.history.events.on('change', () => changes++);
		const measures = score.getElements().measures();
		click(required(measures[0], 'first measure').rect);
		const scrolls = stage.scroller.calls.length;
		key('ArrowRight');
		key('ArrowRight');
		expect(stage.scroller.calls.length).toBe(scrolls + 2);
		expect(stage.scroller.calls.at(-1)).toBe(measures[2]?.rect);
		expect(changes).toBe(0);
	});

	it('draws focus and range overlays and refreshes them after rerendering the same document', async () => {
		const first = await structural('print_new_system.musicxml', {
			view: undefined,
		});
		const measures = first.score.getElements().measures();
		first.click(required(measures[0], 'first measure').rect);
		const background = required(first.stage.created[0], 'background layer');
		const foreground = required(first.stage.created[1], 'focus layer');
		const drawn = background.recording.fills.length;
		const outlined = foreground.recording.fills.length;
		first.click(required(measures[3], 'last measure').rect, true);
		const systems = new Set(measures.map((m) => m.getBox().getSystem()));
		expect(background.recording.fills.slice(drawn)).toHaveLength(systems.size);
		const focus = required(measures[3], 'focus').rect;
		expect(foreground.recording.fills.slice(outlined)).toContainEqual(
			expect.objectContaining({ x: focus.x, w: focus.w, h: 2 }),
		);

		first.controller.dispose();
		const { score: rerendered, stage } = await renderedScore(first.document);
		const view = new FakeEditingView();
		const controller = rerendered.createEditingController(first.editor, {
			view,
		});
		const fresh = rerendered.getElements().measures();
		expect(controller.getPresentation().measures).toEqual(fresh);
		expect(controller.getPresentation().measures[0]).not.toBe(measures[0]);
		expect(controller.getPresentation().structuralFocus).toBe(
			required(fresh[3], 'fresh focus'),
		);
		stage.dom.dispatchEvent(new FakeKeyEvent('ArrowLeft', { shiftKey: true }));
		expect(view.renders.at(-1)?.measures).toEqual(fresh.slice(0, 3));
	});
});

async function structural(
	input: string | MDocument,
	opts: EditingControllerOptions = {},
) {
	const { score, document, stage } = await renderedScore(input);
	const source = required(
		typeof input === 'string' ? document : input,
		'document',
	);
	const editor = new EditingSession(source);
	const view = new FakeEditingView();
	const controller = score.createEditingController(editor, {
		view,
		...opts,
	});
	const click = (rect: Rect, shiftKey = false) =>
		stage.dom.dispatchEvent(
			new FakeClickEvent(rect.x + rect.w / 2, rect.y + rect.h / 2, {
				shiftKey,
			}),
		);
	const key = (name: string, shiftKey = false) =>
		stage.dom.dispatchEvent(new FakeKeyEvent(name, { shiftKey }));
	return {
		score,
		document: source,
		stage,
		editor,
		view,
		controller,
		click,
		key,
	};
}

type Fixture = ReturnType<typeof fixture>;

function required<T>(value: T | null | undefined, what: string): T {
	if (value == null) {
		throw new Error(`missing ${what}`);
	}
	return value;
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
	const create = (offset = 0, opts: EditingControllerOptions = {}) => {
		const host = new FakeHost();
		const decorations = new FakeDecorations();
		const factory = new ElementFactory();
		const index = factory.build(
			factory.model(
				{
					bounds: new Rect(0, 0, 200, 100),
					measures: [
						{
							rect: new Rect(0, 0, 200, 100),
							index: 0,
							number: '1',
							systemIndex: 0,
							staves: [
								{
									part: measure.part.id,
									staff: 1,
									lines: [40, 50, 60, 70, 80],
									left: 0,
									right: 200,
									noteStartX: 10,
								},
							],
							barlines: [],
						},
					],
					notes: [first, second, other].map((mnote, i) => ({
						mnote,
						rect: new Rect(20 + i * 30 + offset, 40, 8, 8),
						ink: new Rect(20 + i * 30 + offset, 40, 8, 8),
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
			),
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
			...opts,
		});
		return { host, score, view, controller, decorations };
	};
	return { editor, first, second, other, hidden, create };
}
