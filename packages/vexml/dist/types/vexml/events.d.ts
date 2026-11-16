import type { Bounded } from './decoration.js';
import type { DrawEvent } from './drawing.js';
import type { Element } from './element.js';
import type { Note } from './note.js';
export interface PointerTargetEvent {
    readonly target: Element | null;
    readonly point: {
        x: number;
        y: number;
    };
    readonly native: PointerEvent;
}
export interface HoverEvent {
    readonly target: Element | null;
    readonly point: {
        x: number;
        y: number;
    } | null;
}
export interface ScoreScrollEvent {
    readonly left: number;
    readonly top: number;
    readonly native: Event;
}
export interface ScoreResizeEvent {
    readonly width: number;
    readonly height: number;
}
export type ScoreEventMap = {
    pointermove: PointerTargetEvent;
    pointerdown: PointerTargetEvent;
    pointerup: PointerTargetEvent;
    click: PointerTargetEvent;
    hover: HoverEvent;
    scroll: ScoreScrollEvent;
    resize: ScoreResizeEvent;
    draw: DrawEvent;
    complete: undefined;
};
export interface CursorChangeEvent {
    readonly timeMs: number;
    readonly timeBeats: number;
    readonly index: number;
    readonly position: Bounded;
    readonly active: readonly Note[];
    readonly highlighted: readonly Note[];
    readonly started: readonly Note[];
    readonly sustained: readonly Note[];
    readonly stopped: readonly Note[];
    readonly done: boolean;
}
export interface CursorVisibilityEvent {
    readonly fullyVisible: boolean;
}
export type CursorEventMap = {
    change: CursorChangeEvent;
    visibility: CursorVisibilityEvent;
    dispose: undefined;
};
