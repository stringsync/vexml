import type { Note as MNote } from '@stringsync/mdom';
import { Rect } from '../core/geometry/index.js';
import type { Note } from './note.js';
import type { TempoMap, TempoSegment } from './tempo-map.js';
/**
 * The built timeline: ordered steps, the tempo map, and lookups. Constructed by SequenceFactory;
 * the CursorController walks it (step/seek/interpolate) and the Score queries it (duration,
 * position->time).
 */
export declare class Sequence {
    private readonly steps;
    private readonly tempo;
    private readonly durationBeats;
    private readonly measureCount;
    private readonly tiedFrom;
    private readonly firstStepOfNote;
    private readonly firstStepOfMeasure;
    private readonly tieAdjacency;
    constructor(steps: Step[], tempo: TempoMap, durationBeats: number, measureCount: number, tiedFrom: ReadonlyMap<Note, Note>, firstStepOfNote: ReadonlyMap<Note, number>, firstStepOfMeasure: ReadonlyMap<number, number>);
    get length(): number;
    adoptGeometry(other: Sequence): void;
    model(indexOf: ReadonlyMap<Note, number>): SequenceModel;
    getStep(index: number): Step | null;
    /** Closest written-note occurrence to a playback time. A preferred voice falls back
     * to available notes; an explicit note filter never falls back to another note. */
    getNoteNearMs(timeMs: number, opts?: NoteNearMsOptions): {
        note: Note;
        timeMs: number;
    } | null;
    getSteps(): readonly Step[];
    getDurationBeats(): number;
    getDurationMs(): number;
    beatsToMs(beats: number): number;
    msToBeats(ms: number): number;
    getStepIndexAtBeats(beat: number): number | null;
    getStepIndexAtMs(ms: number): number | null;
    getMeasureCount(): number;
    getMeasureIndexAtMs(ms: number): number;
    getMeasureIndexAtBeats(beats: number): number;
    positionAt(ms: number): Rect | null;
    resolveX(x: number, startStep: number, endStep: number): {
        stepIndex: number;
        beat: number;
    } | null;
    classify(from: number | null, to: number): CursorTransition;
    getHighlighted(index: number): readonly Note[];
    getFirstStepOfNote(note: Note): number | null;
    getFirstStepOfMeasure(measureIndex: number): number | null;
    getStepRangeOfMeasure(measureIndex: number): {
        start: number;
        end: number;
    } | null;
    static classifyTransition<T>(prevActive: readonly T[] | null, nextActive: readonly T[], tiedFrom: ReadonlyMap<T, T>): {
        started: T[];
        sustained: T[];
        stopped: T[];
    };
}
export interface NoteNearMsOptions {
    voice?: Pick<MNote, 'part' | 'voice'> | null;
    note?: Note;
}
export type Jump = {
    type: 'repeatstart';
} | {
    type: 'repeatend';
    times: number;
} | {
    type: 'repeatending';
    times: number;
    last: boolean;
    number: number;
} | {
    type: 'segno';
    id: string | null;
} | {
    type: 'coda';
    id: string | null;
} | {
    type: 'dacapo';
} | {
    type: 'dalsegno';
    id: string | null;
} | {
    type: 'tocoda';
    id: string | null;
} | {
    type: 'fine';
};
export interface MeasureInfo {
    index: number;
    beats: number;
    tempoBpm: number | null;
    jumps: Jump[];
    systemRect: Rect;
    /** Set on a gap measure: it plays for exactly this many ms regardless of tempo
     * (its `beats` are nominal: the factory maps them to gapMs via a dedicated tempo
     * segment) and gets a synthesized silent step spanning it. */
    gapMs?: number;
}
export interface SequenceNote {
    note: Note;
    measureIndex: number;
    measureBeat: number;
    beats: number;
    x: number;
    tiedFrom: Note | null;
}
export interface SequenceInput {
    measures: MeasureInfo[];
    notes: SequenceNote[];
}
export interface Step {
    readonly index: number;
    readonly measureIndex: number;
    readonly startBeat: number;
    readonly endBeat: number;
    readonly startMs: number;
    readonly endMs: number;
    readonly x: number;
    readonly glideToX: number;
    readonly systemRect: Rect;
    readonly active: readonly Note[];
}
export interface SequenceModel {
    steps: Array<Omit<Step, 'index' | 'startMs' | 'endMs' | 'active'> & {
        active: number[];
    }>;
    segments: readonly TempoSegment[];
    durationBeats: number;
    measureCount: number;
    ties: Array<[number, number]>;
}
export interface CursorTransition {
    readonly started: readonly Note[];
    readonly sustained: readonly Note[];
    readonly stopped: readonly Note[];
}
