import { Rect } from '../core/geometry/index.js';
import type { Note, NoteKey } from './note.js';
import type { RawGeometry } from './score-drawer.js';
import { type MeasureInfo, Sequence, type SequenceInput } from './sequence.js';
import type { TempoMap } from './tempo-map.js';
export interface StepGeometry {
    systemRectOf(measureIndex: number): Rect;
    xOf(note: Note): number | null;
}
export interface StepSkeleton {
    startBeat: number;
    endBeat: number;
    measureIndex: number;
    kind: 'notes' | 'left' | 'gap' | 'seed';
    notes: readonly Note[];
    active: readonly Note[];
}
export interface SequenceSkeleton {
    steps: readonly StepSkeleton[];
    tempo: TempoMap;
    totalBeats: number;
    measures: readonly MeasureInfo[];
    tiedFrom: ReadonlyMap<Note, Note>;
}
export declare class SequencePlacer {
    private readonly skeleton;
    private readonly notesByMnote;
    constructor(skeleton: SequenceSkeleton, notesByMnote: ReadonlyMap<NoteKey, Note>);
    place(geometry: RawGeometry): Sequence;
    placeInput(input: SequenceInput): Sequence;
    private placeOn;
}
