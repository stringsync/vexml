import type { Note } from '@stringsync/mdom';
import type { ScoreReader } from './score-reader.js';
export type HarmonicPitch = 'base' | 'touching' | 'sounding';
export declare function harmonicPitch(note: Note, reader: ScoreReader): HarmonicPitch | null;
/** Whether the note's head is the harmonic diamond. */
export declare function isDiamondHarmonic(note: Note, reader: ScoreReader): boolean;
