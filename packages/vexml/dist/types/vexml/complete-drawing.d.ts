import { type Events } from '../core/events/index.js';
import type { Drawing, DrawingEventMap } from './drawing.js';
export declare class CompleteDrawing implements Drawing {
    private readonly dispatcher;
    readonly events: Events<DrawingEventMap>;
    isComplete(): boolean;
    whenComplete(): Promise<void>;
    drawThroughMeasure(_m: number): void;
    drawAll(): void;
    dispose(): void;
}
