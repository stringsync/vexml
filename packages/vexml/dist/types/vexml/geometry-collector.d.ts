import type { Chord, Harmony, Barline as MBarline, Note as MNote } from '@stringsync/mdom';
import { Rect } from '../core/geometry/index.js';
import { type StaveNote, type TabNote, type TabStave } from 'vexflow/core';
import type { ChordFrame } from './chord-diagram-glyph.js';
import type { TextOutline } from './text-outline.js';
export interface NoteGlyph {
    readonly text: string;
    readonly font: string;
    readonly x: number;
    readonly y: number;
    readonly outline?: TextOutline;
}
export interface RawNote {
    mnote: MNote;
    rect: Rect;
    ink: Rect;
    chord: MNote[];
    measureIndex: number;
    tab: {
        string: number;
        fret: number;
    } | null;
    glyph: NoteGlyph | null;
}
export interface GeometryMark {
    notes: number;
    measures: number;
    chordDiagrams: number;
}
export declare class GeometryCollector {
    private readonly rawNotes;
    private readonly rawMeasures;
    private readonly rawChordDiagrams;
    mark(): GeometryMark;
    rewind(mark: GeometryMark): void;
    collectTabNotes(measureIndex: number, tabStave: TabStave, chords: ReadonlyArray<{
        note: TabNote;
        chord: Chord;
    }>): void;
    collectStaveNotes(measureIndex: number, chords: ReadonlyArray<{
        note: StaveNote;
        chord: Chord;
    }>): void;
    private inkOf;
    private modifierInk;
    addMeasure(measure: RawMeasure): void;
    addChordDiagram(diagram: RawChordDiagram): void;
    decoratedMeasures(tops: {
        decorationTopOf(system: number): number | undefined;
    }): RawMeasure[];
    notes(): RawNote[];
    measures(): RawMeasure[];
    chordDiagrams(): RawChordDiagram[];
}
export interface RawMeasure {
    rect: Rect;
    index: number;
    number: string;
    systemIndex: number;
    staves: RawStave[];
    barlines: RawBarline[];
}
export type BarlineLocation = 'left' | 'right' | 'middle';
export interface RawBarline {
    rect: Rect;
    part: string;
    location: BarlineLocation;
    source: MBarline | null;
}
export interface RawKeyAccidental {
    step: string;
    alter: number;
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface RawStave {
    part: string;
    staff: number;
    lines: number[];
    left: number;
    right: number;
    noteStartX: number;
    keyAccidentals: RawKeyAccidental[];
}
export interface RawChordDiagram {
    rect: Rect;
    harmonySource: Harmony;
    measureIndex: number;
    frame: ChordFrame;
    title: string | null;
}
