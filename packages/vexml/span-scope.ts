import type { Note } from '@stringsync/mdom';
import type { Stave } from 'vexflow/core';

/*
 * Which spanners one build call owns. A whole-score resolve owns all of them; drawing a
 * system at a time hands the builders a window of chords reaching back to the oldest open
 * start, and owns only what the system just drawn completes, so a spanner whose two ends
 * both landed earlier isn't drawn twice.
 */
export interface SpanScope {
	/** Whether the spanner joining these two drawn ends is this call's to draw. */
	owns(from: SpanEnd, to: SpanEnd): boolean;
	/** Whether a start left unpaired, drawn alone as a tick, is this call's to draw. Answer
	 * true once no partner can arrive anymore. */
	ownsOpen(start: Note): boolean;
}

/* A drawn note a spanner can end on: all a scope reads is which stave it landed on. */
export interface SpanEnd {
	getStave(): Stave | undefined;
}

export const WHOLE_SCORE: SpanScope = {
	owns: () => true,
	ownsOpen: () => true,
};
