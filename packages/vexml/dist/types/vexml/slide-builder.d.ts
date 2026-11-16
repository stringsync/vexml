import type { Chord, Note } from '@stringsync/mdom';
import { type TabNote } from 'vexflow/core';
import { SingleSlide } from './single-slide.js';
import { type SpanScope } from './span-scope.js';
import { TabSlideLine } from './tab-slide-line.js';
export interface SlideOptions {
    /** Print the "sl." label on each paired slide (the line always draws). */
    showText: boolean;
    scope?: SpanScope;
}
export declare class SlideBuilder {
    build(chords: Chord[], byTabLead: Map<Note, TabNote>, opts: SlideOptions): Array<TabSlideLine | SingleSlide>;
}
