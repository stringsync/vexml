import { Dispatcher, type Events } from 'webappwiz/events';
import type { Drawing, DrawingEventMap } from './drawing';

/* Fake fulfilling the Drawing seam (preferred over mocks): records the measures it was asked to
 * draw through and reports complete when told. Test-only, excluded from the published package
 * via package.json "files". */
export class FakeDrawing implements Drawing {
	private readonly dispatcher = new Dispatcher<DrawingEventMap>();
	readonly events: Events<DrawingEventMap> = this.dispatcher.events;
	readonly drawnThrough: number[] = [];
	complete = false;
	disposed = false;

	isComplete(): boolean {
		return this.complete;
	}

	whenComplete(): Promise<void> {
		return Promise.resolve();
	}

	drawThroughMeasure(m: number): void {
		this.drawnThrough.push(m);
	}

	drawAll(): void {
		this.complete = true;
	}

	/* Test hook: report systems drawn, as a progressive engraving does. */
	drew(systems: number[]): void {
		this.dispatcher.dispatch('draw', { systems });
	}

	/* Test hook: report the drawing done. */
	finish(): void {
		this.complete = true;
		this.dispatcher.dispatch('complete');
	}

	dispose(): void {
		this.disposed = true;
		this.dispatcher.dispose();
	}
}
