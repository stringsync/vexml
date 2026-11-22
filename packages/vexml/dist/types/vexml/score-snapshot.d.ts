import type { ChordFrame } from './chord-diagram-glyph.js';
import type { StaveModel } from './element-model.js';
import type { NoteGlyph } from './geometry-collector.js';
import type { EncodedPaint, PaintStream } from './paint-encoder.js';
import type { PaintElement } from './paint-op.js';
import type { GapInfo } from './score.js';
import type { SnapshotConfig } from './snapshot-config.js';
import type { TempoSegment } from './tempo-map.js';
/** The snapshot version this vexml renders: a cached snapshot with any other `version` is stale,
 * and `render` throws SnapshotMismatchError on it. */
export declare const SNAPSHOT_VERSION = 7;
/** Marks a ScoreSnapshot among render's other inputs. */
export declare const SNAPSHOT_FORMAT = "vexml-score-snapshot";
/** [x, y, w, h] in score px. */
export type SnapshotRect = [number, number, number, number];
/**
 * A rendered score to cache: take one from Score.snapshot() or createSnapshot, store it as JSON
 * (`JSON.stringify` and `structuredClone` are safe), and pass it to `render` on a later visit
 * for the same Score without parsing, laying out or drawing. Read only `format` and `version`;
 * the rest changes shape between versions.
 */
export interface ScoreSnapshot {
    readonly format: typeof SNAPSHOT_FORMAT;
    readonly version: number;
    /** The config the score was engraved with, as far as it shapes the engraving. */
    readonly config: SnapshotConfig;
    readonly paint: EncodedPaint;
    readonly engraving: SnapshotEngraving | null;
    readonly fold: SnapshotFold | null;
    readonly pages: SnapshotRect[];
    readonly elements: SnapshotElements;
    readonly sequence: SnapshotSequence;
    readonly gaps: GapInfo[];
    /** Outlines of the text it draws, which let `paint` draw it before any font loads: present
     * in a snapshot from createSnapshot, null in one from Score.snapshot(). */
    readonly outlines: SnapshotOutlines | null;
}
export interface SnapshotOutlines {
    glyphs: string[];
    forms: number[];
    fonts: string[];
    texts: number[][];
}
export interface SnapshotEngraving {
    ops: PaintStream;
    elements?: Array<PaintElement | null>;
    width: number;
    height: number;
    origin: [number, number];
    scale: number;
}
export interface SnapshotFold {
    left: number;
    width: number;
    height: number;
    starts: number[];
    strips: PaintStream[];
}
export interface SnapshotElements {
    bounds: SnapshotRect;
    boxes: Array<{
        rect: SnapshotRect;
        index: number;
        number: string;
        systemIndex: number;
    }>;
    parts: Array<{
        id: string;
        label: string | null;
        measures: Array<{
            rect: SnapshotRect;
            index: number;
            number: string;
            voices: Array<{
                id: string;
                staff: number;
                notes: number[];
            }>;
            staves: StaveModel[];
        }>;
    }>;
    fonts: string[];
    notes: SnapshotNote[];
    tabs: Array<{
        note: number;
        rect: SnapshotRect;
        string: number;
        fret: number;
        glyph: NoteGlyph | null;
    }>;
    diagrams: Array<{
        rect: SnapshotRect;
        frame: ChordFrame;
        title: string | null;
    }>;
    barlines: Array<{
        rect: SnapshotRect;
        location: 'left' | 'right' | 'middle';
        part: number;
        measure: number;
    }>;
    targets: number[];
}
export type SnapshotNote = [
    x: number,
    y: number,
    w: number,
    h: number,
    ink: SnapshotRect | null,
    glyph: [text: string, font: number, x: number | null, y: number] | null,
    part: number,
    measure: number,
    pitch: string | null,
    beats: number,
    flags: number,
    chord: number[] | null,
    graces: number[],
    articulations: string[]
];
export interface SnapshotSequence {
    steps: Array<{
        measureIndex: number;
        startBeat: number;
        endBeat: number;
        x: number;
        glideToX: number;
        systemRect: SnapshotRect;
        active: number[];
    }>;
    segments: TempoSegment[];
    durationBeats: number;
    measureCount: number;
    ties: Array<[number, number]>;
}
