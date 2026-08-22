import type { TechnicalMark } from './technical-mark';

export interface FakeTechnicalMarkOptions {
	/** Which side of the stave the mark stacks on. Default above. */
	below?: boolean;
	/** The top edge the mark reports having been drawn at. Default 0. */
	top?: number;
	/** The room the mark claims in its column. Default 10. */
	rowHeight?: number;
	/** The width the mark reports. Default 12. */
	width?: number;
}

/*
 * A technical mark that records what was pinned to it instead of drawing, so a test can
 * assert where a column of marks was stacked and in what ink.
 */
export class FakeTechnicalMark implements TechnicalMark {
	readonly kind = 'technical' as const;
	readonly below: boolean;
	/** The baseline the formatter pinned this mark to, or null until it does. */
	baselineY: number | null = null;
	/** The fill the formatter inked this mark with, or undefined until it does. */
	fillStyle: string | undefined;
	private readonly top: number;
	private readonly height: number;
	private readonly width: number;

	constructor(opts: FakeTechnicalMarkOptions) {
		this.below = opts.below ?? false;
		this.top = opts.top ?? 0;
		this.height = opts.rowHeight ?? 10;
		this.width = opts.width ?? 12;
	}

	rowHeight(): number {
		return this.height;
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

	getBoundingBox(): { getY(): number } {
		return { getY: () => this.top };
	}
}
