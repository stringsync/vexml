import type { Chord, Note } from '@stringsync/mdom';
import { Rect } from '../core/geometry/index.js';
import { type BarNote, type ClefNote, GhostNote, type Modifier, StaveNote, type StemmableNote, type Tickable, type Tuplet, Voice } from 'vexflow/core';
import type { Appearance } from './appearance.js';
import type { BarlineTranslator } from './barline-translator.js';
import type { ChordTranslator } from './chord-translator.js';
import type { DurationTranslator } from './duration-translator.js';
import type { ScoreReader } from './score-reader.js';
import { type MidClefSpec } from './signature-translator.js';
/** What a vexflow voice holds: its notes/rests/ghosts, plus the zero-duration BarNotes and
 * ClefNotes a mid-measure `<barline>` or `<clef>` puts between them. */
export type VoiceTickable = StemmableNote | BarNote | ClefNote;
export declare class VoiceTranslator {
    private readonly chords;
    private readonly durations;
    private readonly barlines;
    private readonly reader;
    constructor(chords: ChordTranslator, durations: DurationTranslator, barlines: BarlineTranslator, reader: ScoreReader);
    useAppearance(appearance: Appearance): void;
    tickables(chords: Chord[], clef: string, opts: VoiceTickablesOptions): VoiceTickable[];
    private beamStems;
    private gapFill;
    softVoice(tickables: Tickable[], softmaxFactor: number): Voice;
    private noteheadHalfWidthCache;
    noteheadHalfWidth(): number;
    tupletRect(tuplet: Tuplet): Rect;
    findModifier<T extends Modifier>(note: {
        getModifiers(): {
            getCategory(): string;
        }[];
    }, category: string): T | undefined;
    private beamsGraceGroup;
}
export interface VoiceTickablesOptions {
    endBeat?: number;
    record?: (lead: Note, staveNote: StaveNote) => void;
    octaveShiftOf?: (lead: Note) => number;
    run?: readonly Chord[];
    recordStandIn?: (lead: Note, ghost: GhostNote) => void;
    defaultStem?: 'up' | 'down';
    autoBeams?: readonly (readonly Note[])[];
    stemOf?: (lead: Note) => 'up' | 'down' | undefined;
    barlines?: readonly {
        beat: number;
        style: string;
    }[];
    midClefs?: readonly MidClefSpec[];
    drawMidClefs?: boolean;
}
