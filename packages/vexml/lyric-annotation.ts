import { Annotation, type StaveNote } from 'vexflow/core';
import { LYRIC_FONT_SIZE, LYRIC_PADDING } from './constants';
import type { LyricJustify, LyricMark } from './lyric-mark';

/*
 * A lyric syllable under the stave. vexflow's own BOTTOM-justified Annotation hangs its
 * text off the note's lowest notehead, so a verse would rise and fall with the melody:
 * a ledger-line note drags its syllable well below the row and a high note tucks its
 * syllable up against the stave. Lyrics read as a line of text, so the draw pass pins one
 * baseline per stave (see LyricPlacer.pin) and this draws there instead.
 *
 * Subclassing keeps everything else an Annotation gives: the static Annotation.format()
 * still runs (the subclass inherits the 'Annotation' modifier category), so a wide
 * syllable reserves its width in the layout pass, and the drawn text still lands in the
 * note's bounding box so the page grows to fit it.
 */
export class LyricAnnotation extends Annotation implements LyricMark {
	readonly kind = 'lyric' as const;

	readonly textSize: number;

	private baselineY = 0;

	constructor(
		text: string,
		/** 0-based verse index: which row under the stave this syllable sits on. Not readonly:
		 * a stave carrying several voices offsets each voice's rows past the ones the voices
		 * before it used (see {@link shiftVerses}). */
		public verseIndex: number,
		/** Whether a melisma `<extend/>` line trails this syllable (drawn by LyricPlacer). */
		readonly extend: boolean,
		/** A CSS font-family list to type the syllable in. Absent means vexflow's text face. */
		family?: string,
		/** Which edge of the note the syllable lines up with (`<lyric justify>`). */
		readonly justify: LyricJustify = 'center',
		/** Ratio of the syllable's font-size to the score's lyric-font. */
		scale = 1,
	) {
		super(text);
		this.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
		this.textSize = LYRIC_FONT_SIZE * scale;
		if (family) {
			this.setFont(family, this.textSize);
		} else {
			this.setFontSize(this.textSize);
		}
	}

	setBaselineY(y: number): void {
		this.baselineY = y;
	}

	/** Push this syllable `rows` rows further from the stave. Voices sharing a stave each
	 * number their verses from 1, so without an offset per voice every voice's first verse
	 * would land on the same row and overprint. */
	shiftVerses(rows: number): void {
		this.verseIndex += rows;
	}

	/*
	 * The text width plus a word gap either side. Annotation.format reserves exactly the
	 * text's own width, which leaves neighboring syllables touching once a measure is
	 * squeezed to its minimum. The padding is symmetric, so it costs the centering nothing.
	 */
	override getWidth(): number {
		return super.getWidth() + 2 * LYRIC_PADDING;
	}

	/*
	 * Where the syllable's box starts, given its note's notehead span. Center straddles the
	 * notehead, left starts the text at the notehead's left edge and right ends it at the
	 * notehead's right edge; the box keeps its padding either side, so the ink lines up.
	 */
	boxLeft(noteheadBeginX: number, noteheadEndX: number): number {
		const w = this.getWidth();
		switch (this.justify) {
			case 'left':
				return noteheadBeginX - LYRIC_PADDING;
			case 'right':
				return noteheadEndX + LYRIC_PADDING - w;
			default:
				return (noteheadBeginX + noteheadEndX) / 2 - w / 2;
		}
	}

	override draw(): void {
		const ctx = this.checkContext();
		// Lyrics are only attached to StaveNotes (see NotationTranslator.addLyrics).
		const note = this.checkAttachedNote() as StaveNote;
		this.setRendered();
		// Line the syllable up with the notehead per its justify; only the vertical
		// placement is ours.
		this.x = this.boxLeft(note.getNoteHeadBeginX(), note.getNoteHeadEndX());
		this.y = this.baselineY;
		this.renderText(ctx, 0, 0);
	}
}
