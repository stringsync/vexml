import type { Rect } from 'webappwiz/geometry';
import type { Scroller, ScrollerOptions } from './scroller';

/* Fake fulfilling the Scroller seam (preferred over mocks); records what it was told, so tests
 * that don't care simply never read `calls`/`cancels`. Test-only — excluded from the published
 * package via package.json "files". */

export class FakeScroller implements Scroller {
	readonly calls: Rect[] = [];
	readonly options: (ScrollerOptions | undefined)[] = [];
	cancels = 0;
	resizeSuspends = 0;
	scrollIntoView(rect: Rect, opts?: ScrollerOptions): void {
		this.calls.push(rect);
		this.options.push(opts);
	}
	cancel(): void {
		this.cancels++;
	}
	suspendForResize(): void {
		this.resizeSuspends++;
	}
}
