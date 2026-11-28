import { type Voice } from 'vexflow/core';
/**
 * Tuck the lower flat of a two-accidental fifth partly under the upper flat,
 * overlapping horizontally without touching (Behind Bars p. 88). Naturals and
 * closer intervals keep their full column offset so vertical strokes stay clear.
 * Runs after `Formatter.joinVoices` in both width planning and final formatting so
 * the saved left shift is reflected in measure widths and drawing alike.
 */
export declare function tuckChordAccidentals(voices: Voice[]): void;
