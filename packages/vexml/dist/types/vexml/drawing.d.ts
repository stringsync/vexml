import type { Resource } from '../core/disposable/index.js';
import type { Events } from '../core/events/index.js';
export interface DrawEvent {
    readonly systems: readonly number[];
}
export type DrawingEventMap = {
    draw: DrawEvent;
    complete: undefined;
};
export interface DrawnThrough {
    drawThroughMeasure(m: number): void;
}
export interface Drawing extends DrawnThrough, Resource {
    isComplete(): boolean;
    whenComplete(): Promise<void>;
    drawAll(): void;
    readonly events: Events<DrawingEventMap>;
}
