import type { Rect } from '../geometry';
import type { Scroller } from '../host/scroll-controller';

/* Fake fulfilling the Scroller seam (preferred over mocks); records what it was told, so tests
 * that don't care simply never read `calls`/`cancels`. Test-only — excluded from the published
 * package via package.json "files". */

export class FakeScroller implements Scroller {
	readonly calls: Rect[] = [];
	cancels = 0;
	resizeSuspends = 0;
	scrollIntoView(rect: Rect): void {
		this.calls.push(rect);
	}
	cancel(): void {
		this.cancels++;
	}
	suspendForResize(): void {
		this.resizeSuspends++;
	}
}
