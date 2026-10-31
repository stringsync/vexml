// vet-ignore-file compact-files: came in at this size from the upstream repository; splitting it is a refactor of its own
import { type Measure as MMeasure, Note as MNote } from '@stringsync/mdom';
import { Disposer, type Resource } from 'core/disposable';
import { Dispatcher, type Eventful, type Events } from 'core/events';
import { Rect } from 'core/geometry';
import { Barline } from './barline';
import { DefaultEditingBindings } from './default-editing-bindings';
import type {
	EditingBindings,
	EditingCommand,
	EditingKey,
} from './editing-bindings';
import { editingCaretRect } from './editing-caret';
import type { EditingNavigator } from './editing-navigator';
import type {
	EditingBarline,
	EditingSession,
	EditingStructuralTarget,
	EditingVoice,
} from './editing-session';
import type { EditingPresentation, EditingView } from './editing-view';
import type { Element } from './element';
import type { ElementIndex } from './element-index';
import type { PointerTargetEvent, ScoreEventMap } from './events';
import { Measure } from './measure';
import type { Scroller, ScrollerOptions } from './scroller';
import type { SelectionOverlayOptions } from './selection-overlay';

export interface EditingControllerOptions {
	bindings?: EditingBindings;
	/** Disable input, selection visuals and following without losing document selection. */
	enabled?: boolean;
	keyboard?: boolean;
	pointer?: boolean;
	/** A plain click on the focused note clears selection when enabled. */
	toggleOnClick?: boolean;
	/** When false, dismissing selection retains focus and toggling cannot remove its final note. */
	allowDeselect?: boolean;
	/** Follow focus changes, never manual viewport scrolling. Defaults to true. */
	follow?: boolean;
	/** Default overlay appearance, or false for no built-in view. */
	selection?: SelectionOverlayOptions | false;
	/** A custom view, owned and disposed by the controller. */
	// vet-ignore noop-objects-over-null: the caller may omit a custom view; Score resolves that to the built-in overlay or a NoopEditingView before the controller sees it
	view?: EditingView;
}

export interface EditingControllerDeps {
	elements: ElementIndex;
	navigator: EditingNavigator;
	events: Events<ScoreEventMap>;
	dom: EventTarget;
	scroller: Scroller;
	view: EditingView;
}

export type EditingControllerEvents = {
	change: EditingPresentation;
	command: { command: EditingCommand; moved: boolean };
	dispose: undefined;
};

/** One render's interaction and presentation. Disposing it never disposes the editing session. */
export class EditingController
	implements Eventful<EditingControllerEvents>, Resource
{
	private readonly dispatcher = new Dispatcher<EditingControllerEvents>();
	readonly events = this.dispatcher.events;
	private readonly disposer = new Disposer();
	private readonly bindings: EditingBindings;
	private disposed = false;
	private enabled: boolean;
	private presentation: EditingPresentation;
	private drag: {
		pointerId: number;
		start: { x: number; y: number };
		client: { x: number; y: number };
		initial: readonly MNote[];
		additive: boolean;
		rect: Rect | null;
		notes: readonly MNote[];
	} | null = null;
	private suppressedClick: number | null = null;

	constructor(
		readonly editor: EditingSession,
		private readonly deps: EditingControllerDeps,
		private readonly opts: EditingControllerOptions = {},
	) {
		this.enabled = opts.enabled ?? true;
		this.bindings = opts.bindings ?? new DefaultEditingBindings();
		this.presentation = this.resolve();
		this.disposer.use(deps.view);
		this.disposer.defer(
			editor.events.on('selectionchange', () => this.refresh()),
		);
		this.disposer.defer(editor.events.on('caretchange', () => this.refresh()));
		this.disposer.defer(
			editor.events.on('documentchange', () => this.refresh()),
		);
		if (opts.pointer !== false) {
			this.disposer.defer(
				deps.events.on('pointerdown', (event) => this.pointerDown(event)),
			);
			this.disposer.defer(
				deps.events.on('pointermove', (event) => this.pointerMove(event)),
			);
			this.disposer.defer(
				deps.events.on('pointerup', (event) => this.pointerUp(event)),
			);
			const captureEnd = (event: Event) => {
				const pointer = event as PointerEvent;
				if (pointer.pointerId !== this.drag?.pointerId) {
					return;
				}
				if (
					event.type === 'lostpointercapture' &&
					(pointer.buttons & 1) === 0
				) {
					// Chrome can release capture before pointerup. Capture-loss coordinates
					// are unreliable, so commit the last displayed preview.
					this.commitDrag();
				} else {
					this.endDrag();
				}
			};
			for (const type of ['pointercancel', 'lostpointercapture']) {
				deps.dom.addEventListener(type, captureEnd);
				this.disposer.defer(() =>
					deps.dom.removeEventListener(type, captureEnd),
				);
			}

			this.disposer.defer(
				deps.events.on('click', (event) => this.click(event)),
			);
		}
		if (opts.keyboard !== false) {
			const keydown = (event: Event) => {
				if (event.target !== deps.dom) {
					return;
				}
				const key = event as KeyboardEvent;
				if (key.defaultPrevented || key.isComposing) {
					return;
				}
				if (this.handleKey(key)) {
					key.preventDefault();
				}
			};
			deps.dom.addEventListener('keydown', keydown);
			this.disposer.defer(() =>
				deps.dom.removeEventListener('keydown', keydown),
			);
			if (
				typeof HTMLElement !== 'undefined' &&
				deps.dom instanceof HTMLElement &&
				!deps.dom.hasAttribute('tabindex')
			) {
				const element = deps.dom;
				element.tabIndex = 0;
				this.disposer.defer(() => {
					if (element.getAttribute('tabindex') === '0') {
						element.removeAttribute('tabindex');
					}
				});
			}
		}
		this.renderView();
	}

	/** Switching interaction never changes selection, scroll position or the rendered score. */
	setEnabled(enabled: boolean): void {
		if (this.disposed || this.enabled === enabled) {
			return;
		}
		this.endDrag();
		this.enabled = enabled;
		this.renderView();
	}

	private renderView(): void {
		this.deps.view.render(
			this.enabled
				? this.presentation
				: {
						selected: [],
						focus: null,
						caret: null,
						measures: [],
						barline: null,
						structuralFocus: null,
						position: null,
					},
		);
	}

	get navigator(): EditingNavigator {
		return this.deps.navigator;
	}
	getPresentation(): EditingPresentation {
		return this.presentation;
	}

	handleKey(key: EditingKey): boolean {
		if (this.disposed || !this.enabled) {
			return false;
		}
		if (key.key === 'Escape' && this.drag) {
			this.endDrag();
			return true;
		}
		const command = this.bindings.resolve(key);
		if (!command) {
			return false;
		}
		this.execute(command);
		return true;
	}

	execute(command: EditingCommand): boolean {
		if (this.disposed || !this.enabled) {
			return false;
		}
		let moved = false;
		switch (command.type) {
			case 'undo':
				moved = this.editor.undo();
				break;
			case 'redo':
				moved = this.editor.redo();
				break;
			case 'move':
				moved = this.navigator.move(command.move, { extend: command.extend });
				break;
			case 'select':
				if (command.chordEdge) {
					moved = this.navigator.selectChordEdge(
						command.note,
						command.chordEdge,
					);
				} else {
					this.editor.select(command.note);
					moved = true;
				}
				break;
			case 'clear':
				if (this.opts.allowDeselect === false) {
					const focus = this.editor.getFocus();
					const measure = this.editor.getStructuralFocus();
					if (focus && this.editor.getSelection().length > 1) {
						this.editor.select(focus);
						moved = true;
					} else if (
						measure &&
						!this.isBarline(measure) &&
						this.editor.getSelectedMeasures().length > 1
					) {
						this.editor.selectMeasure(measure);
						moved = true;
					}
					break;
				}
				moved =
					this.editor.getSelection().length > 0 ||
					this.editor.getCaret() !== null ||
					this.editor.getStructuralFocus() !== null;
				this.editor.clearSelection();
				break;
		}
		this.dispatcher.dispatch('command', { command, moved });
		return moved;
	}

	selectVoice(voice: EditingVoice): boolean {
		return !this.disposed && this.enabled && this.navigator.selectVoice(voice);
	}

	scrollIntoView(opts?: ScrollerOptions): void {
		if (!this.disposed && this.presentation.position) {
			this.deps.scroller.scrollIntoView(this.presentation.position, opts);
		}
	}

	dispose(): void {
		if (this.disposed) {
			return;
		}
		this.endDrag();
		this.disposed = true;
		this.disposer.dispose();
		this.dispatcher.dispatch('dispose');
		this.dispatcher.dispose();
	}

	private pointerDown(event: PointerTargetEvent): void {
		const key = event.native;
		if (
			!this.enabled ||
			key.defaultPrevented ||
			key.button !== 0 ||
			key.isPrimary === false ||
			key.pointerType === 'touch' ||
			this.drag
		) {
			return;
		}
		this.suppressedClick = null;
		this.drag = {
			pointerId: key.pointerId,
			start: event.point,
			client: { x: key.clientX, y: key.clientY },
			initial: this.editor.getSelection(),
			additive: key.ctrlKey || key.metaKey,
			rect: null,
			notes: [],
		};
		const dom = this.domElement();
		dom?.focus({ preventScroll: true });
		dom?.setPointerCapture(key.pointerId);
		key.preventDefault();
	}

	private pointerMove(event: PointerTargetEvent): void {
		const drag = this.drag;
		if (!drag || event.native.pointerId !== drag.pointerId) {
			return;
		}
		if (
			!drag.rect &&
			Math.hypot(
				event.native.clientX - drag.client.x,
				event.native.clientY - drag.client.y,
			) < 4
		) {
			return;
		}
		drag.rect = new Rect(
			Math.min(drag.start.x, event.point.x),
			Math.min(drag.start.y, event.point.y),
			Math.abs(event.point.x - drag.start.x),
			Math.abs(event.point.y - drag.start.y),
		);
		const hits = new Set(
			this.deps.elements
				.within(drag.rect)
				.flatMap((element) =>
					element
						.getSources()
						.filter((source): source is MNote => source instanceof MNote),
				),
		);
		const notes = this.editor.document.score.parts.flatMap((part) =>
			part.measures.flatMap((measure) =>
				measure.notes.filter((note) => hits.has(note)),
			),
		);
		drag.notes = [
			...new Set([...(drag.additive ? drag.initial : []), ...notes]),
		];
		if (!drag.notes.length && this.opts.allowDeselect === false) {
			drag.notes = drag.initial;
		}
		this.suppressedClick = drag.pointerId;
		this.refresh();
	}

	private pointerUp(event: PointerTargetEvent): void {
		const drag = this.drag;
		if (!drag || event.native.pointerId !== drag.pointerId) {
			return;
		}
		this.pointerMove(event);
		this.commitDrag();
	}

	private commitDrag(): void {
		const drag = this.drag;
		if (drag?.rect) {
			this.editor.selectNotes(drag.notes);
		}
		this.endDrag();
	}

	private endDrag(): void {
		const drag = this.drag;
		if (!drag) {
			return;
		}
		this.drag = null;
		const dom = this.domElement();
		if (dom?.hasPointerCapture(drag.pointerId)) {
			dom.releasePointerCapture(drag.pointerId);
		}
		this.presentation = this.resolve();
		this.renderView();
		this.dispatcher.dispatch('change', this.presentation);
	}

	private domElement(): HTMLElement | null {
		return typeof HTMLElement !== 'undefined' &&
			this.deps.dom instanceof HTMLElement
			? this.deps.dom
			: null;
	}

	private click(event: PointerTargetEvent): void {
		if (event.native.pointerId === this.suppressedClick) {
			this.suppressedClick = null;
			return;
		}
		if (!this.enabled || event.native.defaultPrevented) {
			return;
		}
		const note = event.target
			?.getSources()
			.find((source): source is MNote => source instanceof MNote);
		const structural = note ? null : this.structuralTarget(event.target);
		const key = event.native;
		const selection = this.editor.getSelection();
		if (structural) {
			if (!key.ctrlKey && !key.metaKey) {
				this.clickStructural(structural, key.shiftKey);
			}
		} else if (
			this.opts.allowDeselect === false &&
			selection.length > 1 &&
			(!note || !selection.includes(note)) &&
			!key.shiftKey &&
			!key.ctrlKey &&
			!key.metaKey
		) {
			this.execute({ type: 'clear' });
		} else if (!note) {
			if (!key.ctrlKey && !key.metaKey) {
				this.execute({ type: 'clear' });
			}
		} else if (key.shiftKey) {
			if (this.editor.canExtendTo(note)) {
				this.editor.select(note, { extend: true });
			}
		} else if (key.ctrlKey || key.metaKey) {
			if (
				this.opts.allowDeselect !== false ||
				this.editor.getSelection().length !== 1 ||
				this.editor.getFocus() !== note
			) {
				this.editor.toggle(note);
			}
		} else if (
			this.opts.allowDeselect !== false &&
			this.opts.toggleOnClick &&
			this.editor.getFocus() === note &&
			this.editor.getSelection().length === 1
		) {
			this.editor.clearSelection();
		} else {
			this.editor.select(note);
		}
		if (
			typeof HTMLElement !== 'undefined' &&
			this.deps.dom instanceof HTMLElement
		) {
			this.deps.dom.focus({ preventScroll: true });
		}
	}

	/** The measure or barline a pointer target stands for; null for a snapshot's, which has no document. */
	private structuralTarget(
		target: Element | null,
	): EditingStructuralTarget | null {
		if (target instanceof Measure) {
			return target.getSources()[0] ?? null;
		}
		if (target instanceof Barline) {
			const measure = target.getMeasure().getSources()[0];
			return measure
				? {
						measure,
						location: target.getLocation(),
						barline: target.getSources()[0] ?? null,
					}
				: null;
		}
		return null;
	}

	/** Shift extends a measure range from the structural anchor, or from the focus note's bar,
	 * within one part; a target in another part, or a barline, starts afresh. */
	private clickStructural(
		target: EditingStructuralTarget,
		extend: boolean,
	): void {
		const focus = this.editor.getStructuralFocus();
		if (
			this.opts.allowDeselect !== false &&
			this.opts.toggleOnClick &&
			!extend &&
			focus &&
			this.sameTarget(focus, target) &&
			this.editor.getSelectedMeasures().length <= 1
		) {
			this.editor.clearSelection();
			return;
		}
		if (this.isBarline(target)) {
			this.editor.selectBarline(target);
			return;
		}
		const anchor = this.editor.getStructuralAnchor();
		const note = this.editor.getFocus();
		if (extend && anchor && !this.isBarline(anchor)) {
			this.editor.selectMeasure(target, {
				extend: anchor.part === target.part,
			});
		} else if (extend && note && note.part === target.part) {
			this.editor.selectMeasure(note.measure);
			this.editor.selectMeasure(target, { extend: true });
		} else {
			this.editor.selectMeasure(target);
		}
	}

	private sameTarget(
		a: EditingStructuralTarget,
		b: EditingStructuralTarget,
	): boolean {
		if (this.isBarline(a) && this.isBarline(b)) {
			return (
				a.measure === b.measure &&
				a.location === b.location &&
				a.barline === b.barline
			);
		}
		return a === b;
	}

	private isBarline(target: EditingStructuralTarget): target is EditingBarline {
		return 'barline' in target;
	}

	private refresh(): void {
		const previous = this.presentation.position;
		this.presentation = this.resolve();
		this.renderView();
		const position = this.presentation.position;
		if (
			this.enabled &&
			!this.drag &&
			this.opts.follow !== false &&
			position !== previous &&
			(!position || !previous || !position.isEqual(previous))
		) {
			this.scrollIntoView({ behavior: 'smooth' });
		}
		this.dispatcher.dispatch('change', this.presentation);
	}

	private resolve(): EditingPresentation {
		const source = this.editor.getFocus();
		const focus = source
			? (this.deps.elements.noteLookup.get(source) ?? null)
			: null;
		const fallback = source
			? this.deps.elements
					.measureBoxes()
					.find((box) => box.getSources().includes(source.measure))
			: null;
		const target = this.drag?.rect ? null : this.editor.getCaret();
		const caret = target ? editingCaretRect(this.deps.elements, target) : null;
		const structural = this.drag?.rect ? null : this.resolveStructural();
		return {
			selected: this.drag?.rect
				? this.drag.notes.flatMap((note) => {
						const element = this.deps.elements.noteLookup.get(note);
						return element ? [element] : [];
					})
				: this.editor.getSelectedElements(this.deps.elements),
			...(this.drag?.rect ? { marquee: this.drag.rect } : {}),
			focus,
			caret,
			measures: structural?.measures ?? [],
			barline: structural?.barline ?? null,
			structuralFocus: structural?.focus ?? null,
			position:
				caret ??
				focus?.rect ??
				fallback?.rect ??
				structural?.focus?.rect ??
				structural?.measure?.rect ??
				null,
		};
	}

	/** The current render's elements for the session's measures and barline. */
	private resolveStructural(): {
		measures: Measure[];
		barline: Barline | null;
		focus: Measure | Barline | null;
		/* The focus's measure, which places an undrawn barline. */
		// vet-ignore noop-objects-over-null: a focus may have no measure; absence is selection data
		measure: Measure | null;
	} | null {
		const target = this.editor.getStructuralFocus();
		if (!target) {
			return null;
		}
		const measureOf = new Map<MMeasure, Measure>();
		for (const measure of this.deps.elements.measures()) {
			for (const source of measure.getSources()) {
				measureOf.set(source, measure);
			}
		}
		const measures = this.editor
			.getSelectedMeasures()
			.flatMap((source) => measureOf.get(source) ?? []);
		const selected = this.editor.getSelectedBarline();
		const barline = selected
			? (this.deps.elements
					.barlines()
					.find(
						(element) =>
							element.getLocation() === selected.location &&
							element.getMeasure() === measureOf.get(selected.measure) &&
							(element.getSources()[0] ?? null) === selected.barline,
					) ?? null)
			: null;
		const measure =
			measureOf.get(this.isBarline(target) ? target.measure : target) ?? null;
		return {
			measures,
			barline,
			focus: this.isBarline(target) ? barline : measure,
			measure,
		};
	}
}
