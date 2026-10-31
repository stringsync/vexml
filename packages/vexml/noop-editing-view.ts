import type { EditingPresentation, EditingView } from './editing-view';

/** An editing view that draws nothing, for a controller with no built-in or custom view. */
export class NoopEditingView implements EditingView {
	render(_state: EditingPresentation): void {}

	dispose(): void {}
}
