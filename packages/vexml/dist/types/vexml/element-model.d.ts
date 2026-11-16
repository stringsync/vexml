import type { Harmony, Barline as MBarline, Measure as MMeasure, Note as MNote, Part as MPart } from '@stringsync/mdom';
import type { Rect } from '../core/geometry/index.js';
import type { ChordFrame } from './chord-diagram-glyph.js';
import type { BarlineLocation, NoteGlyph, RawStave } from './geometry-collector.js';
import type { NoteFacts, NoteKey } from './note.js';
export interface ElementModel {
    bounds: Rect;
    boxes: BoxModel[];
    parts: PartModel[];
    notes: NoteModel[];
    tabs: TabModel[];
    diagrams: DiagramModel[];
    barlines: BarlineModel[];
    targets: number[];
}
export interface BoxModel {
    rect: Rect;
    index: number;
    number: string;
    systemIndex: number;
    sources: readonly MMeasure[];
}
export interface PartModel {
    id: string;
    label: string | null;
    measures: MeasureModel[];
    source: MPart | null;
}
export interface MeasureModel {
    rect: Rect;
    index: number;
    number: string;
    voices: VoiceModel[];
    staves: StaveModel[];
    source: MMeasure | null;
}
export interface BarlineModel {
    rect: Rect;
    location: BarlineLocation;
    part: number;
    measure: number;
    source: MBarline | null;
}
export interface StaveModel {
    staff: number;
    lines: number[];
    left: number;
    right: number;
    noteStartX: number;
}
export interface VoiceModel {
    id: string;
    staff: number;
    notes: number[];
}
export interface NoteModel {
    key: NoteKey;
    facts: NoteFacts;
    rect: Rect;
    ink: Rect;
    glyph: NoteGlyph | null;
    part: number;
    measure: number;
    chord: number[];
    source: MNote | null;
}
export interface TabModel {
    note: number;
    rect: Rect;
    string: number;
    fret: number;
    glyph: NoteGlyph | null;
}
export interface DiagramModel {
    rect: Rect;
    frame: ChordFrame;
    title: string | null;
    source: Harmony | null;
}
export declare function staveModelsOf(staves: readonly RawStave[], part: string): StaveModel[];
