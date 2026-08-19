/*
 * One lyric syllable hanging under a note. The draw pass reads these off a note's
 * modifiers to lay a verse out as a line of text (LyricPlacer), and to renumber the
 * verses of a stave's second and later voices (VoiceBuilder).
 *
 * The engraved implementation is LyricAnnotation, a vexflow Annotation. This interface
 * is only the part the draw pass touches, so a test can place lyrics without vexflow's
 * text machinery.
 */
export interface LyricMark {
	/** Tells a lyric apart from the other modifiers a note carries. */
	readonly kind: 'lyric';
	/** 0-based verse index: which row under the stave this syllable sits on. */
	readonly verseIndex: number;
	/** Whether a melisma `<extend/>` line trails this syllable. */
	readonly extend: boolean;
	/** The syllable's drawn width, including the gap it keeps from its neighbors. */
	getWidth(): number;
	/** Draw the syllable's text with its baseline at `y`, rather than under its own note. */
	setBaselineY(y: number): void;
	/** The ink to draw the syllable in. */
	setStyle(style: { fillStyle?: string }): void;
	/** Push this syllable `rows` rows further from the stave. Voices sharing a stave each
	 * number their verses from 1, so without an offset per voice every voice's first verse
	 * would land on the same row and overprint. */
	shiftVerses(rows: number): void;
}

/** Whether `modifier` is a lyric syllable. Narrows in place, so filtering a note's
 * modifiers keeps whatever else the caller knows about them. */
export function isLyricMark<T>(modifier: T): modifier is T & LyricMark {
	return (modifier as LyricMark | null)?.kind === 'lyric';
}
