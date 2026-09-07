import { Note as MNote } from '@stringsync/mdom';
import { Disposer, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful, type Events } from 'webappwiz/events';
import { Rect } from 'webappwiz/geometry';
import { DefaultEditingBindings } from './default-editing-bindings';
import type {
	EditingBindings,
	EditingCommand,
	EditingKey,
} from './editing-bindings';
import type { EditingNavigator } from './editing-navigator';
import type { EditingSession, EditingVoice } from './editing-session';
import type { EditingPresentation, EditingView } from './editing-view';
import type { ElementIndex } from './element-index';
import type { PointerTargetEvent, ScoreEventMap } from './events';
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
	/** When false, user input cannot clear the selection or toggle away its final note. */
	allowDeselect?: boolean;
	/** Follow focus changes, never manual viewport scrolling. Defaults to true. */
	follow?: boolean;
	/** Default overlay appearance, or false for no built-in view. */
	selection?: SelectionOverlayOptions | false;
	/** A custom view, owned and disposed by the controller. */
	view?: EditingView;
}

export interface EditingControllerDeps {
	elements: ElementIndex;
	navigator: EditingNavigator;
	events: Events<ScoreEventMap>;
	dom: EventTarget;
	scroller: Scroller;
	view: EditingView | null;
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
		private readonly options: EditingControllerOptions = {},
	) {
		this.enabled = options.enabled ?? true;
		this.bindings = options.bindings ?? new DefaultEditingBindings();
		this.presentation = this.resolve();
		if (deps.view) {
			this.disposer.use(deps.view);
		}
		this.disposer.defer(
			editor.events.on('selectionchange', () => this.refresh()),
		);
		if (options.pointer !== false) {
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
		if (options.keyboard !== false) {
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
		this.deps.view?.render(
			this.enabled
				? this.presentation
				: { selected: [], focus: null, position: null },
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
				if (this.options.allowDeselect === false) {
					break;
				}
				moved = this.editor.getSelection().length > 0;
				this.editor.clearSelection();
				break;
		}
		this.dispatcher.dispatch('command', { command, moved });
		return moved;
	}

	selectVoice(voice: EditingVoice): boolean {
		return !this.disposed && this.enabled && this.navigator.selectVoice(voice);
	}

	scrollIntoView(options?: ScrollerOptions): void {
		if (!this.disposed && this.presentation.position) {
			this.deps.scroller.scrollIntoView(this.presentation.position, options);
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
		if (!drag.notes.length && this.options.allowDeselect === false) {
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
		const key = event.native;
		if (!note) {
			if (
				this.options.allowDeselect !== false &&
				!key.ctrlKey &&
				!key.metaKey
			) {
				this.editor.clearSelection();
			}
		} else if (key.ctrlKey || key.metaKey) {
			if (
				this.options.allowDeselect !== false ||
				this.editor.getSelection().length !== 1 ||
				this.editor.getFocus() !== note
			) {
				this.editor.toggle(note);
			}
		} else if (
			this.options.allowDeselect !== false &&
			this.options.toggleOnClick &&
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

	private refresh(): void {
		const previous = this.presentation.position;
		this.presentation = this.resolve();
		this.renderView();
		if (
			this.enabled &&
			!this.drag &&
			this.options.follow !== false &&
			this.presentation.position !== previous
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
		return {
			selected: this.drag?.rect
				? this.drag.notes.flatMap((note) => {
						const element = this.deps.elements.noteLookup.get(note);
						return element ? [element] : [];
					})
				: this.editor.getSelectedElements(this.deps.elements),
			...(this.drag?.rect ? { marquee: this.drag.rect } : {}),
			focus,
			position: focus?.rect ?? fallback?.rect ?? null,
		};
	}
}
