import type { Chord, Note } from '@stringsync/mdom';
import { type StaveNote, VibratoBracket } from 'vexflow/core';
import { type SpanScope } from './span-scope.js';
export declare class WavyLineBuilder {
    build(chords: Chord[], byLead: Map<Note, StaveNote>, scope?: SpanScope): VibratoBracket[];
}
