import { FINGERING_FONT_SIZE, TECHNICAL_ROW_GAP } from './constants';
import { TechnicalAnnotation } from './technical-annotation';

export interface FingeringAnnotationOptions {
	/** Set in italic typeface (Behind Bars p. 374: right-hand `<pluck>` letters `p`, `i`, `m`, `a`). */
	italic?: boolean;
}

/* Serves <pluck> as well as <fingering>: both print a short digit or letter off the notehead,
 * so they share one compact style, with <pluck> set in italic to distinguish right-hand letters. */
export class FingeringAnnotation extends TechnicalAnnotation {
	readonly italic: boolean;

	constructor(
		text: string,
		below: boolean,
		opts: FingeringAnnotationOptions = {},
	) {
		super(text, below);
		this.italic = opts.italic ?? false;
		this.setFontSize(FINGERING_FONT_SIZE);
		if (this.italic) {
			this.fontStyle = 'italic';
		}
	}

	override rowHeight(): number {
		return FINGERING_FONT_SIZE + TECHNICAL_ROW_GAP;
	}
}
