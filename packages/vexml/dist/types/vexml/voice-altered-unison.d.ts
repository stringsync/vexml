import { type ModifierContext, type StaveNote } from 'vexflow/core';
/**
 * Separate the heads of a double-stemmed altered unison and place the right
 * voice's accidental between the two heads so each sign clearly belongs to its
 * own voice (Behind Bars p. 91). Returns true when handled.
 */
export declare function offsetAlteredUnison(context: ModifierContext, members: ReturnType<ModifierContext['getMembers']>, second: StaveNote, up: StaveNote, down: StaveNote, tieRight: StaveNote | null, formatPair: (context: ModifierContext, members: ReturnType<ModifierContext['getMembers']>, second: StaveNote, right: StaveNote, shift: number) => void): boolean;
