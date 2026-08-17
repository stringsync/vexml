import type { CursorChangeEvent } from '../../events';
import type { CursorView } from './cursor-view';

/* Fake fulfilling the CursorView seam (preferred over mocks); records every change it was
 * rendered with and whether it was disposed. Test-only — excluded from the published package via
 * package.json "files". */
export class FakeCursorView implements CursorView {
	readonly events: CursorChangeEvent[] = [];
	disposed = false;

	render(e: CursorChangeEvent): void {
		this.events.push(e);
	}

	dispose(): void {
		this.disposed = true;
	}
}
