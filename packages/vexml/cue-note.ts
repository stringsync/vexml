import type { Note as MNote } from '@stringsync/mdom';

/*
 * A `<cue/>` note is printed small, takes its place in the measure and makes no sound.
 * mdom keeps the element raw, so it is read off the note's children here.
 */
export function isCueNote(note: MNote): boolean {
	return note.child('cue') !== null;
}

/*
 * Whether a note is engraved at cue size: a `<cue/>` note, or a `<type size="cue">`
 * (`grace-cue` is a grace note's cue size; a grace is already drawn small). `size="large"`
 * is the opposite, see isLargeNote.
 */
export function isCueSized(note: MNote): boolean {
	const size = note.child('type')?.getAttribute('size');
	return isCueNote(note) || size === 'cue' || size === 'grace-cue';
}

/* Whether the note's `<type size="large">` asks for a larger than normal head. */
export function isLargeNote(note: MNote): boolean {
	return note.child('type')?.getAttribute('size') === 'large';
}
