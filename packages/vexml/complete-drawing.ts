import { Dispatcher, type Events } from 'webappwiz/events';
import type { Drawing, DrawingEventMap } from './drawing';

/* The drawing of a score engraved whole before its Score existed: complete from the start, with
 * nothing to draw through or wait for. */
export class CompleteDrawing implements Drawing {
	private readonly dispatcher = new Dispatcher<DrawingEventMap>();
	readonly events: Events<DrawingEventMap> = this.dispatcher.events;

	isComplete(): boolean {
		return true;
	}

	whenComplete(): Promise<void> {
		return Promise.resolve();
	}

	drawThroughMeasure(_m: number): void {}

	drawAll(): void {}

	dispose(): void {
		this.dispatcher.dispose();
	}
}
