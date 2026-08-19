import { Annotation, Modifier } from 'vexflow';
import { LYRIC_FONT_SIZE, LYRIC_PADDING } from './constants';
import type { LyricMark } from './lyric-mark';

/*
 * A lyric syllable under the stave. vexflow's own BOTTOM-justified Annotation hangs its
 * text off the note's lowest notehead, so a verse would rise and fall with the melody —
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

	private baselineY = 0;

	constructor(
		text: string,
		/** 0-based verse index — which row under the stave this syllable sits on. Not readonly:
		 * a stave carrying several voices offsets each voice's rows past the ones the voices
		 * before it used (see {@link shiftVerses}). */
		public verseIndex: number,
		/** Whether a melisma `<extend/>` line trails this syllable (drawn by LyricPlacer). */
		readonly extend = false,
	) {
		super(text);
		this.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
		this.setFontSize(LYRIC_FONT_SIZE);
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

	override draw(): void {
		const ctx = this.checkContext();
		const note = this.checkAttachedNote();
		this.setRendered();
		// Center the syllable on the notehead, the same horizontal treatment a CENTER-
		// justified Annotation gets; only the vertical placement is ours.
		const start = note.getModifierStartXY(Modifier.Position.ABOVE, this.index);
		this.x = start.x - this.getWidth() / 2;
		this.y = this.baselineY;
		this.renderText(ctx, 0, 0);
	}
}
