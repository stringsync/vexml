import type { EditingPresentation, EditingView } from './editing-view.js';
/** An editing view that draws nothing, for a controller with no built-in or custom view. */
export declare class NoopEditingView implements EditingView {
    render(_state: EditingPresentation): void;
    dispose(): void;
}
