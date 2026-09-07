import { Note as MNote } from '@stringsync/mdom';
import { Disposer, type Resource } from 'webappwiz/disposable';
import { Dispatcher, type Eventful, type Events } from 'webappwiz/events';
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
		this.disposed = true;
		this.disposer.dispose();
		this.dispatcher.dispatch('dispose');
		this.dispatcher.dispose();
	}

	private click(event: PointerTargetEvent): void {
		if (!this.enabled) {
			return;
		}
		const note = event.target
			?.getSources()
			.find((source): source is MNote => source instanceof MNote);
		const key = event.native;
		if (!note) {
			this.editor.clearSelection();
		} else if (key.ctrlKey || key.metaKey) {
			this.editor.toggle(note);
		} else if (key.shiftKey) {
			this.editor.select(note, { extend: this.editor.canExtendTo(note) });
		} else if (
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
			selected: this.editor.getSelectedElements(this.deps.elements),
			focus,
			position: focus?.rect ?? fallback?.rect ?? null,
		};
	}
}
