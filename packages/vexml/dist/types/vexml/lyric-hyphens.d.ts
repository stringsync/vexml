import type { RenderContext } from 'vexflow/core';
import type { PinnedSyllable } from './lyric-placer.js';
export interface RestSpan {
    readonly x: number;
    readonly ticks: number;
}
export interface SystemHyphenInput {
    readonly system: number;
    readonly pinned: readonly PinnedSyllable[];
    readonly restsByRow: ReadonlyMap<number, readonly RestSpan[]> | undefined;
    readonly hyphenDistance: number | null;
    readonly notationColor: string;
    readonly context: RenderContext;
}
export declare function drawSystemHyphens(input: SystemHyphenInput): void;
