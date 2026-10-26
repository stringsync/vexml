import { FINGERING_FONT_SIZE, TECHNICAL_ROW_GAP } from './constants';
import { TechnicalAnnotation } from './technical-annotation';

/* A note's <footnote>: its text set small above the stave, in the same column the
 * fingerings use, so the draw pass stacks it and keeps other marks clear of it. */
export class FootnoteAnnotation extends TechnicalAnnotation {
	constructor(text: string) {
		super(text, false);
		this.setFontSize(FINGERING_FONT_SIZE);
	}

	override rowHeight(): number {
		return FINGERING_FONT_SIZE + TECHNICAL_ROW_GAP;
	}
}
