import type { Chord, Note } from '@stringsync/mdom';
import type { StaveNote } from 'vexflow/core';
import { NotationSlide } from './notation-slide.js';
import { SingleSlide } from './single-slide.js';
import { type SpanScope } from './span-scope.js';
export declare class GlissandoBuilder {
    build(chords: Chord[], byLead: Map<Note, StaveNote>, scope?: SpanScope): Array<NotationSlide | SingleSlide>;
}
