import type { Part } from '@stringsync/mdom';
import type { Gaps } from './gaps.js';
import type { Note, NoteKey } from './note.js';
import type { RawGeometry } from './score-drawer.js';
import type { ScoreReader } from './score-reader.js';
import { Sequence, type SequenceInput, type SequenceModel } from './sequence.js';
import { SequencePlacer } from './sequence-placer.js';
import { Timeline } from './timeline.js';
export declare class SequenceFactory {
    private readonly reader;
    private readonly gaps;
    constructor(reader: ScoreReader, gaps: Gaps);
    create(parts: Part[], geometry: RawGeometry, notesByMnote: ReadonlyMap<NoteKey, Note>): Sequence;
    restore(model: SequenceModel, notes: readonly Note[]): Sequence;
    createFromInput(input: SequenceInput): Sequence;
    begin(parts: Part[], geometry: RawGeometry, notesByMnote: ReadonlyMap<NoteKey, Note>): SequencePlacer;
    private skeletonOf;
    timeline(parts: Part[]): Timeline;
    private unroll;
    private buildInput;
    private placeGraces;
    private swingWarps;
    private quarterBpm;
    private measureBeats;
    private samePitch;
    private tiedFromOf;
}
