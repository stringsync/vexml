import type { Chord, Note } from '@stringsync/mdom';
import { type DocumentBezier, type ScoreReader } from './score-reader.js';
export declare class CurveConnectors {
    private readonly reader;
    private readonly connectors;
    private readonly ties;
    private readonly reaches;
    private documentCurves;
    constructor(reader: ScoreReader);
    useDocumentCurves(enabled: boolean): void;
    tiesOf(note: Note): TieEnd[];
    connectorsOf(note: Note): {
        slurs: SlurConnector[];
        techniques: SlurConnector[];
    };
    slurConnectors(note: Note, spans: Array<Set<Note>>): SlurConnector[];
    slurSpans(chords: Chord[]): Array<Set<Note>>;
    reach(note: Note): number;
}
export type TieEnd = {
    bezier: DocumentBezier | null;
    partner: Note | null;
    dash: number[] | null;
    orientation: string | null;
};
export type SlurConnector = {
    bezier: DocumentBezier | null;
    slurType: string;
    partner: {
        note: Note;
    } | null;
    placement: string | null;
    dash: number[] | null;
};
