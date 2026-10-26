import type { RenderContext } from 'vexflow/core';
import { LYRIC_FONT_SIZE } from './constants';
import type { LyricJustify, LyricMark } from './lyric-mark';

export interface FakeLyricMarkOptions {
	/** Whether a melisma line trails the syllable. Default false. */
	extend?: boolean;
	/** The width the syllable reports. Default 20. */
	width?: number;
	/** Which edge of its note the syllable lines up with. Default 'center'. */
	justify?: LyricJustify;
	/** Whether the syllable ends in a hyphen. Default false. */
	hyphenated?: boolean;
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
	readonly extend: boolean;
	readonly hyphenated: boolean;
	/** The x of each extra hyphen the placer drew, in order. */
	readonly hyphens: number[] = [];
	readonly justify: LyricJustify;
	readonly textSize = LYRIC_FONT_SIZE;
	private readonly width: number;

	constructor(
		public verseIndex: number,
		opts: FakeLyricMarkOptions,
	) {
		this.extend = opts.extend ?? false;
		this.hyphenated = opts.hyphenated ?? false;
		this.width = opts.width ?? 20;
		this.justify = opts.justify ?? 'center';
	}

	boxLeft(noteheadBeginX: number, noteheadEndX: number): number {
		if (this.justify === 'left') {
			return noteheadBeginX;
		}
		if (this.justify === 'right') {
			return noteheadEndX - this.width;
		}
		return (noteheadBeginX + noteheadEndX) / 2 - this.width / 2;
	}

	getWidth(): number {
		return this.width;
	}

	drawHyphen(_ctx: RenderContext, x: number): void {
		this.hyphens.push(x);
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
