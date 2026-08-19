import type { Chord, Note } from '@stringsync/mdom';

/*
 * The MusicXML note attributes the translators branch on. These are one-line reads, but the
 * same four are read from both the notation path (ChordTranslator) and the tablature one
 * (TabTranslator), which draw the same attribute differently — so what each one MEANS is
 * documented once, here, rather than twice at the two sites that act on it.
 */
export class NoteReader {
	/*
	 * A <harmonic> in this note's <notations><technical>: drawn as a diamond notehead on a
	 * notation stave (see ChordTranslator.vexflowKey) and as an angle-bracketed fret on tab
	 * (see TabTranslator.positions()).
	 */
	isHarmonic(note: Note): boolean {
		return note.isHarmonic;
	}

	/*
	 * A <notehead>x</notehead>: an X-shaped notehead (a dead/muted note), drawn as a cross on a
	 * notation stave and as an "X" in place of the fret on tab.
	 */
	isXNotehead(note: Note): boolean {
		return note.notehead?.value === 'x';
	}

	/*
	 * A <notehead parentheses="yes">: a ghost/optional note, drawn with round brackets around the
	 * notehead on a notation stave and the fret wrapped in "()" on tab.
	 */
	isParenthesized(note: Note): boolean {
		return note.notehead?.parentheses ?? false;
	}

	/*
	 * A <notehead>slash</notehead>: a rhythm-slash head, drawn as an oblique bar in place of the
	 * oval. vexflow has no key-suffix for it (unlike '/X2' for the X head), so
	 * ChordTranslator overrides the glyph after the StaveNote is built. SMuFL: open bar for
	 * whole/half, filled for quarter and shorter — matching vexflow's own duration split for
	 * X/diamond heads.
	 */
	isSlashNotehead(note: Note): boolean {
		return note.notehead?.value === 'slash';
	}

	/*
	 * True when the note is the held tail of a tie (carries a tieType 'stop'). Such a note is
	 * not re-struck, so it prints no accidental and its fret is omitted from the tab.
	 */
	isTieStop(note: Chord['notes'][number]): boolean {
		return note.ties.some((tie) => tie.tieType === 'stop');
	}
}
