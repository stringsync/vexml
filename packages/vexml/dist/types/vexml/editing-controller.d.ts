import { type Resource } from '../core/disposable/index.js';
import { type Eventful, type Events } from '../core/events/index.js';
import type { EditingBindings, EditingCommand, EditingKey } from './editing-bindings.js';
import type { EditingNavigator } from './editing-navigator.js';
import type { EditingSession, EditingVoice } from './editing-session.js';
import type { EditingPresentation, EditingView } from './editing-view.js';
import type { ElementIndex } from './element-index.js';
import type { ScoreEventMap } from './events.js';
import type { Scroller, ScrollerOptions } from './scroller.js';
import type { SelectionOverlayOptions } from './selection-overlay.js';
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
    command: {
        command: EditingCommand;
        moved: boolean;
    };
    dispose: undefined;
};
/** One render's interaction and presentation. Disposing it never disposes the editing session. */
export declare class EditingController implements Eventful<EditingControllerEvents>, Resource {
    readonly editor: EditingSession;
    private readonly deps;
    private readonly opts;
    private readonly dispatcher;
    readonly events: Events<EditingControllerEvents>;
    private readonly disposer;
    private readonly bindings;
    private disposed;
    private enabled;
    private presentation;
    private drag;
    private suppressedClick;
    constructor(editor: EditingSession, deps: EditingControllerDeps, opts?: EditingControllerOptions);
    /** Switching interaction never changes selection, scroll position or the rendered score. */
    setEnabled(enabled: boolean): void;
    private renderView;
    get navigator(): EditingNavigator;
    getPresentation(): EditingPresentation;
    handleKey(key: EditingKey): boolean;
    execute(command: EditingCommand): boolean;
    selectVoice(voice: EditingVoice): boolean;
    scrollIntoView(opts?: ScrollerOptions): void;
    dispose(): void;
    private pointerDown;
    private pointerMove;
    private pointerUp;
    private commitDrag;
    private endDrag;
    private domElement;
    private click;
    /** The measure or barline a pointer target stands for; null for a snapshot's, which has no document. */
    private structuralTarget;
    /** Shift extends a measure range from the structural anchor, or from the focus note's bar,
     * within one part; a target in another part, or a barline, starts afresh. */
    private clickStructural;
    private sameTarget;
    private isBarline;
    private refresh;
    private resolve;
    /** The current render's elements for the session's measures and barline. */
    private resolveStructural;
}
