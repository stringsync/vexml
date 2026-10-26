import type { Config } from './config';
import {
	HEADER_CREDIT_SIZE,
	HEADER_FOOTER_SIZE,
	HEADER_SUBTITLE_SIZE,
	HEADER_SYMBOL_SIZE,
	HEADER_TITLE_SIZE,
	PAGE_MARGIN_X,
} from './constants';
import type { ScoreHeader } from './score-reader';

/* One line of the header: its text, size and weight, the x its `align` side hangs from, and
 * its baseline below the header's top. */
export type HeaderLine = {
	text: string;
	size: number;
	weight: 'bold' | 'normal';
	align: 'left' | 'center' | 'right';
	x: number;
	baseline: number;
	/* Set in the notation font, for a SMuFL glyph. */
	glyph?: boolean;
};

/*
 * Where the score header's lines go: the title and subtitles centered on the page, then the
 * left and right columns side by side beneath them. The layout planner reserves its height
 * above the first system and the draw pass lays its lines out at the page width, so both
 * read the one stack here.
 */
export class HeaderPlan {
	private constructor(private readonly header: ScoreHeader) {}

	/* The plan for a render, or null when there is nothing to print: the header is off, the
	 * score names nothing, or the layout is panoramic, one endless row with no page to head. */
	static of(config: Config, header: ScoreHeader | null): HeaderPlan | null {
		return config.showHeader && config.layout.type !== 'panoramic' && header
			? new HeaderPlan(header)
			: null;
	}

	/* From the header's top to the lowest descender, in px; 0 when only a footer prints. */
	height(width: number): number {
		return this.stack(width).height;
	}

	/* The copyright lines, centered at the page width, and their height. */
	footer(width: number): { lines: HeaderLine[]; height: number } {
		const lines: HeaderLine[] = [];
		let y = 0;
		for (const text of this.header.footer) {
			y += HEADER_FOOTER_SIZE;
			lines.push({
				text,
				size: HEADER_FOOTER_SIZE,
				weight: 'normal',
				align: 'center',
				x: width / 2,
				baseline: y,
			});
			y += HEADER_FOOTER_SIZE * DESCENT;
		}
		return { lines, height: y };
	}

	lines(width: number): HeaderLine[] {
		return this.stack(width).lines;
	}

	/* A credit line's width, estimated at 0.6 of its font size per character: the planner has
	 * no canvas to measure with. */
	private creditWidth(text: string): number {
		return text.length * HEADER_CREDIT_SIZE * 0.6;
	}

	private stack(width: number): { lines: HeaderLine[]; height: number } {
		const lines: HeaderLine[] = [];
		// The baseline sits one font size below the line's top; the descenders and the gap to
		// the next line take DESCENT of it again.
		let y = 0;
		const centered = [
			...(this.header.title
				? [{ text: this.header.title, size: HEADER_TITLE_SIZE }]
				: []),
			...this.header.subtitles.map((text) => ({
				text,
				size: HEADER_SUBTITLE_SIZE,
			})),
		];
		for (const [index, { text, size }] of centered.entries()) {
			y += size;
			lines.push({
				text,
				size,
				weight: index === 0 && this.header.title ? 'bold' : 'normal',
				align: 'center',
				x: width / 2,
				baseline: y,
			});
			y += size * DESCENT;
		}
		if (this.header.symbols.length > 0) {
			y += HEADER_SYMBOL_SIZE;
			lines.push({
				text: this.header.symbols.join(' '),
				size: HEADER_SYMBOL_SIZE,
				weight: 'normal',
				align: 'center',
				x: width / 2,
				baseline: y,
				glyph: true,
			});
			y += HEADER_SYMBOL_SIZE * DESCENT;
		}
		const rows = Math.max(this.header.left.length, this.header.right.length);
		if (rows > 0 && centered.length > 0) {
			y += SIDE_GAP;
		}
		for (let row = 0; row < rows; row++) {
			const left = this.header.left[row];
			const right = this.header.right[row];
			// Side by side unless their estimated widths would run into each other, then the
			// right column's line drops to a row of its own under the left's.
			const stacked =
				!!left &&
				!!right &&
				this.creditWidth(left) + this.creditWidth(right) + SIDE_GAP >
					width - 2 * PAGE_MARGIN_X;
			y += HEADER_CREDIT_SIZE;
			const sides = [
				{ text: left, align: 'left', x: PAGE_MARGIN_X },
				{ text: right, align: 'right', x: width - PAGE_MARGIN_X },
			] as const;
			for (const { text, align, x } of sides) {
				if (!text) {
					continue;
				}
				if (stacked && align === 'right') {
					y += HEADER_CREDIT_SIZE;
				}
				lines.push({
					text,
					size: HEADER_CREDIT_SIZE,
					weight: 'normal',
					align,
					x,
					baseline: y,
				});
				if (stacked && align === 'left') {
					y += HEADER_CREDIT_SIZE * DESCENT;
				}
			}
			y += HEADER_CREDIT_SIZE * DESCENT;
		}
		return { lines, height: y };
	}
}

/* A line's descent plus leading, as a fraction of its font size. */
const DESCENT = 0.35;

/* Extra room between the centered lines and the side columns under them. */
const SIDE_GAP = 6;
