import type { Note } from '@stringsync/mdom';
import type { Stave } from 'vexflow/core';
export interface SpanScope {
    /** Whether the spanner joining these two drawn ends is this call's to draw. */
    owns(from: SpanEnd, to: SpanEnd): boolean;
    /** Whether a start left unpaired, drawn alone as a tick, is this call's to draw. Answer
     * true once no partner can arrive anymore. */
    ownsOpen(start: Note): boolean;
}
export interface SpanEnd {
    getStave(): Stave | undefined;
}
export declare const WHOLE_SCORE: SpanScope;
