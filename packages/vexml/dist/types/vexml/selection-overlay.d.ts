import type { EditingPresentation, EditingView } from './editing-view.js';
import type { Layer } from './layer.js';
export interface SelectionOverlayOptions {
    /** Selected note color, also used translucently for the cursor halo and selection region. */
    color?: string;
    /** Cursor halo outline color; defaults to the selection color. */
    focusColor?: string;
    /** Step-entry caret color; defaults to the focus color. */
    caretColor?: string;
    /** Step-entry caret width in score pixels. Defaults to 2. */
    caretWidth?: number;
}
/** Shared halo geometry on editing-owned layers, independent of hover and playback. */
export declare class SelectionOverlay implements EditingView {
    private readonly layer;
    private readonly opts;
    private readonly focusLayer;
    private previous;
    private previousFocus;
    private previousCaret;
    private readonly halo;
    private readonly color;
    constructor(layer: Layer, opts?: SelectionOverlayOptions, focusLayer?: Layer);
    render(state: EditingPresentation): void;
    dispose(): void;
    /** A frame `width` thick inside `rect`. */
    private outline;
    private padded;
    /** One band per score line, so a range across a system break shades each line's bars only. */
    private measureRegions;
    /** Separate enclosures per score line avoid shading the gap between wrapped systems. */
    private regions;
}
