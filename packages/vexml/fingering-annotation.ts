import { FINGERING_FONT_SIZE, TECHNICAL_ROW_GAP } from './constants';
import { TechnicalAnnotation } from './technical-annotation';

/* Serves <pluck> as well as <fingering>: both print a short digit or letter off the notehead,
 * so they share one compact style. */
export class FingeringAnnotation extends TechnicalAnnotation {
	constructor(text: string, below: boolean) {
		super(text, below);
		this.setFontSize(FINGERING_FONT_SIZE);
	}

	override rowHeight(): number {
		return FINGERING_FONT_SIZE + TECHNICAL_ROW_GAP;
	}
}
