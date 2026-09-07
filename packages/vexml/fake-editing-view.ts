import type { EditingPresentation, EditingView } from './editing-view';

export class FakeEditingView implements EditingView {
	readonly renders: EditingPresentation[] = [];
	disposed = false;
	render(state: EditingPresentation): void {
		this.renders.push(state);
	}
	dispose(): void {
		this.disposed = true;
	}
}
