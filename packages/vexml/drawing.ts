import type { Resource } from 'core/disposable';
import type { Events } from 'core/events';

/* The systems a progressive render drew since the last such event, by index, top to bottom. */
export interface DrawEvent {
	readonly systems: readonly number[];
}

export type DrawingEventMap = {
	draw: DrawEvent;
	complete: undefined;
};

/* The part of a Drawing a cursor needs: that the system it stands on is drawn before it reads
 * geometry there, so it never lands on a planned spot. */
export interface DrawnThrough {
	/* Draw through the system measure `m` is on, now. A no-op once it is. */
	drawThroughMeasure(m: number): void;
}

/* How far a score's engraving has come: whole from the start for most renders
 * (CompleteDrawing), or growing a system at a time for a progressive one (ProgressiveEngraving;
 * see Config.progressive). Disposing it cancels whatever is left to draw. */
export interface Drawing extends DrawnThrough, Resource {
	isComplete(): boolean;
	whenComplete(): Promise<void>;
	/* Draw everything left, now. */
	drawAll(): void;
	readonly events: Events<DrawingEventMap>;
}
