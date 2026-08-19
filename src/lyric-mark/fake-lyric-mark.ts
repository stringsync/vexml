import type { LyricMark } from './lyric-mark';

export interface FakeLyricMarkOptions {
	/** Whether a melisma line trails the syllable. Default false. */
	extend?: boolean;
	/** The width the syllable reports. Default 20. */
	width?: number;
}

/*
 * A lyric syllable that records what was pinned to it instead of drawing, so a test can
 * assert where a verse was laid out and in what ink.
 */
export class FakeLyricMark implements LyricMark {
	readonly kind = 'lyric' as const;
	/** The baseline the placer pinned this syllable to, or null until it does. */
	baselineY: number | null = null;
	/** The fill the placer inked this syllable with, or undefined until it does. */
	fillStyle: string | undefined;
	verseIndex: number;
	readonly extend: boolean;
	private readonly width: number;

	constructor(verseIndex: number, opts: FakeLyricMarkOptions = {}) {
		this.verseIndex = verseIndex;
		this.extend = opts.extend ?? false;
		this.width = opts.width ?? 20;
	}

	getWidth(): number {
		return this.width;
	}

	setBaselineY(y: number): void {
		this.baselineY = y;
	}

	setStyle(style: { fillStyle?: string }): void {
		this.fillStyle = style.fillStyle;
	}

	shiftVerses(rows: number): void {
		this.verseIndex += rows;
	}
}
